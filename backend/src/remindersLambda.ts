import {
  CognitoIdentityProviderClient,
  paginateListUsers,
  type UserType,
} from '@aws-sdk/client-cognito-identity-provider';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { createDynamoStore } from './dynamoStore.js';
import { runReminders, type Member } from './reminders.js';

const cognito = new CognitoIdentityProviderClient({});
const ses = new SESv2Client({});
const store = createDynamoStore(process.env.TABLE_NAME!);

const attr = (u: UserType, name: string) => u.Attributes?.find((a) => a.Name === name)?.Value;

/** Everyone with a confirmed account and a verified email address. */
async function* members(): AsyncGenerator<Member> {
  for await (const page of paginateListUsers({ client: cognito }, { UserPoolId: process.env.USER_POOL_ID! })) {
    for (const u of page.Users ?? []) {
      const email = attr(u, 'email');
      const userId = attr(u, 'sub');
      if (!u.Enabled || u.UserStatus !== 'CONFIRMED' || !email || !userId || attr(u, 'email_verified') !== 'true') continue;
      yield { userId, email, name: attr(u, 'name') ?? email.split('@')[0]! };
    }
  }
}

// Invoked on a schedule by EventBridge Scheduler (see infra/terraform/reminders.tf).
export const handler = async () => {
  const result = await runReminders({
    members,
    store,
    now: new Date(),
    siteUrl: process.env.SITE_URL!,
    send: async (e) => {
      await ses.send(
        new SendEmailCommand({
          FromEmailAddress: `Evincers Vision Board <${process.env.FROM_EMAIL!}>`,
          Destination: { ToAddresses: [e.to] },
          Content: {
            Simple: {
              Subject: { Data: e.subject, Charset: 'UTF-8' },
              Body: { Text: { Data: e.text, Charset: 'UTF-8' }, Html: { Data: e.html, Charset: 'UTF-8' } },
            },
          },
        }),
      );
    },
  });
  console.log('Reminder run finished', result);
  return result;
};
