// Local stand-in for API Gateway + Lambda + DynamoDB, for working on the UI without AWS.
//   npm run dev:api        (listens on http://127.0.0.1:8787, data lives in memory)
//
// The web app's dev mode (config.json with "devMode": true) sends a fake token of the form
// "dev.<base64 claims>"; this server trusts it. It binds to localhost only and is never
// bundled into the Lambda.
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { createServer } from 'node:http';
import { handle } from '../src/handler.js';
import { createMemoryStore } from './memoryStore.js';

const PORT = Number(process.env.PORT ?? 8787);
const ORIGIN = process.env.DEV_ORIGIN ?? 'http://localhost:5173';
const store = createMemoryStore();

function claimsFrom(header: string | undefined): Record<string, unknown> | undefined {
  const token = header?.replace(/^Bearer\s+/i, '');
  if (!token?.startsWith('dev.')) return undefined;
  try {
    return JSON.parse(decodeURIComponent(Buffer.from(token.slice(4), 'base64').toString('utf8')));
  } catch {
    return undefined;
  }
}

createServer(async (req, res) => {
  const cors = {
    'access-control-allow-origin': ORIGIN,
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    vary: 'origin',
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors).end();
    return;
  }

  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = Buffer.concat(chunks).toString('utf8') || undefined;

  const claims = claimsFrom(req.headers.authorization);
  if (!claims) {
    res.writeHead(401, { ...cors, 'content-type': 'application/json' }).end('{"message":"Unauthorized"}');
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const event = {
    rawPath: url.pathname,
    body,
    isBase64Encoded: false,
    requestContext: { http: { method: req.method }, authorizer: { jwt: { claims } } },
  } as unknown as APIGatewayProxyEventV2;

  const out = await handle(event, store);
  res.writeHead(out.statusCode ?? 200, { ...cors, ...(out.headers as Record<string, string>) });
  res.end(out.body);
}).listen(PORT, '127.0.0.1', () => console.log(`Dev API listening on http://127.0.0.1:${PORT}`));
