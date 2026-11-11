# Evincers Vision Board

A vision board the whole church can use. Every member has their own account, writes down the visions God has put on
their heart, breaks each one into actionable steps, and tracks progress over time. Members can optionally share a
vision with the church community feed.

> “Write the vision and make it plain on tablets, that he may run who reads it.” — Habakkuk 2:2

**Fully serverless, deployed into your own AWS account with Terraform.**

## Features

- **Accounts** — email + password sign-up with emailed verification code, sign-in, forgot-password (Amazon Cognito)
- **Visions** — title, one of 13 areas of life (spiritual, family, relationships, health, mind, work, business, finances,
  ministry, learning, creativity, lifestyle, other), time horizon (immediate or long-term, like the printed card),
  "make it plain" description, anchor scripture, target date, status
- **Actionable steps** — checklist per vision with due dates, shown as a trail of stepping stones up to the summit
- **My Journey** — a game-like map: earn XP for writing visions, finishing steps, giving thanks and seeing visions
  fulfilled; climb six levels (Dreamer → Planner → Builder → Pathfinder → Overcomer → Visionary); keep a weekly
  streak; collect 10 badges
- **Gratitude journal** — the "What I'm grateful for" section of the postcard, kept all year
- **Weekly email reminders** — a Monday check-in with what is overdue, what is due this week, progress on each vision and
  a verse. Members choose weekly, monthly or off in Settings
- **Printable Postcard & Write-Up** — the Visionary Postcard and The Write-Up, pre-filled from a member's board or
  printed blank for handwriting (A5 landscape)
- **Verse of the day**, **Up next** list across all visions, level-up and badge celebrations
- **Community** — opt-in per vision. Others see title, description, scripture and progress. **Steps and email are never shared.**
- **Privacy by default** — every vision is private until you tick “Share with the church community”
- Responsive with a phone tab bar, light/dark mode, keyboard accessible

## Architecture

```
                     ┌────────────────────────── your AWS account ───────────────────────────┐
                     │                                                                       │
 Browser ──HTTPS──▶  CloudFront ──(OAC)──▶ S3 (private bucket: React SPA + config.json)       │
   │                 │                                                                       │
   │  sign up / in   │                                                                       │
   ├───(SRP)────────▶ Cognito User Pool  ── issues ID token (JWT) ─┐                         │
   │                                                               ▼                         │
   └──── Bearer JWT ─────────────────────▶ API Gateway (HTTP API, JWT authorizer)            │
                                                   │  verified claims (sub, name)            │
                                                   ▼                                         │
                                           Lambda (Node 22, arm64) ──▶ DynamoDB (on-demand)  │
                     │                                                                       │
                     │  EventBridge Scheduler ──(Mondays)──▶ Reminders Lambda ──▶ SES ──▶ email
                     │                                   reads Cognito users + DynamoDB      │
                     └───────────────────────────────────────────────────────────────────────┘
```

| Concern | Service | Notes |
| --- | --- | --- |
| Static site | S3 + CloudFront | Bucket is private (Origin Access Control); security headers + CSP; SPA fallback to `index.html` |
| Auth | Cognito User Pool | Self sign-up (toggle with `allow_self_signup`), SRP auth, no client secret |
| API | API Gateway HTTP API | JWT authorizer verifies the token **before** Lambda runs; throttled; access logs |
| Compute | One Lambda | Small router in `backend/src/handler.ts`; IAM scoped to this one table only |
| Data | DynamoDB single table | PAY_PER_REQUEST, point-in-time recovery, one sparse GSI for the community feed |
| Reminders | EventBridge Scheduler → Lambda → SES | Optional; off until `reminder_from_email` is set. Read-only access to data and the user list |
| Config | `config.json` in the bucket | Written by Terraform (API URL, Cognito IDs) so the same build works in any environment |

**Data model** (`PK` / `SK`)

| Item | PK | SK |
| --- | --- | --- |
| Vision | `USER#<sub>` | `VISION#<id>` |
| Step | `USER#<sub>` | `STEP#<visionId>#<id>` |
| Gratitude entry | `USER#<sub>` | `GRATITUDE#<id>` |
| Settings | `USER#<sub>` | `PROFILE` |
| Community index | `GSI1PK = SHARED` (only on shared visions) | `GSI1SK = <updatedAt>#<id>` |

Every query is scoped by the caller's Cognito `sub` taken from the verified token, never from the request, so one member
cannot read or change another's data (covered by tests).

**API** (all routes require a valid token)

| Route | Purpose |
| --- | --- |
| `GET /visions` · `POST /visions` | list / create my visions |
| `GET /visions/{id}` · `PATCH /visions/{id}` · `DELETE /visions/{id}` | read (with steps) / edit / delete (cascades to steps) |
| `POST /visions/{id}/steps` · `PATCH …/steps/{stepId}` · `DELETE …/steps/{stepId}` | manage steps; progress counters recomputed |
| `GET /steps/upcoming` | my open steps, soonest first |
| `GET /community` | visions shared with the church |
| `GET /me` · `PATCH /me` | profile, verse of the day, reminder frequency |
| `GET /journey` | XP, level, streak and badges (computed from your data) |
| `GET /gratitude` · `POST /gratitude` · `DELETE /gratitude/{id}` | gratitude journal |

## Repository layout

```
backend/            Lambda API + reminder emailer (TypeScript), tests, local dev server
  src/handler.ts      routes & business rules
  src/dynamoStore.ts  DynamoDB access (single-table design)
  dev/                in-memory store + local API server (no AWS needed)
web/                React + Vite + TypeScript single-page app
infra/terraform/    All AWS infrastructure
scripts/            deploy.sh, dev-config.sh
.github/workflows/  CI (typecheck, tests, build, terraform validate)
```

## Deploy to your AWS account

**Prerequisites:** Node 20+ (22 recommended), [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.6,
[AWS CLI](https://aws.amazon.com/cli/) configured for your account (`aws sts get-caller-identity` should show the right
account), and permissions to create IAM, Lambda, API Gateway, Cognito, DynamoDB, S3 and CloudFront resources.

```bash
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars   # optional: edit region, domain, etc.
./scripts/deploy.sh
```

`deploy.sh` runs the tests, bundles the Lambda, runs `terraform apply` (it shows you the plan and asks for
confirmation), builds the site, syncs it to S3 and invalidates CloudFront. It prints the site URL at the end.
Re-run it any time to ship changes.

Prefer to run the steps yourself?

```bash
(cd backend && npm ci && npm run build)
terraform -chdir=infra/terraform init
terraform -chdir=infra/terraform apply
(cd web && npm ci && npm run build)
aws s3 sync web/dist s3://$(terraform -chdir=infra/terraform output -raw web_bucket) --delete --exclude config.json
aws cloudfront create-invalidation --distribution-id $(terraform -chdir=infra/terraform output -raw cloudfront_distribution_id) --paths "/*"
```

### Deploy from GitHub (CI/CD)

Once set up, every push to `main` tests, builds and deploys to your AWS account. No AWS keys are stored in GitHub:
the workflow gets short-lived credentials through OpenID Connect, and the role can only be assumed by **this repo's
`main` branch**.

**One-time setup (you run this with your own AWS login):**

1. **Make `main` the default branch.** GitHub → repo → *Settings → Branches* → rename the default branch to `main`
   (or merge the working branch into `main`).
2. **Create the state bucket, lock table and deploy role:**
   ```bash
   terraform -chdir=infra/bootstrap init
   terraform -chdir=infra/bootstrap apply          # add -var create_oidc_provider=false if your account already has GitHub's OIDC provider
   terraform -chdir=infra/bootstrap output
   ```
3. **Add four repository variables** in GitHub → *Settings → Secrets and variables → Actions → Variables* (variables, not secrets):

   | Variable | Value (from the `output` above) |
   | --- | --- |
   | `AWS_DEPLOY_ROLE_ARN` | `deploy_role_arn` |
   | `AWS_REGION` | `region` |
   | `TF_STATE_BUCKET` | `tf_state_bucket` |
   | `TF_LOCK_TABLE` | `tf_lock_table` |

4. **Deploy:** push to `main`, or run it by hand from *Actions → Deploy → Run workflow*. The site URL appears in the
   run summary.

> If you already deployed from your laptop with local state, move that state first so CI doesn't try to create
> everything again: `scripts/use-remote-state.sh <bucket> <table> <region>` then
> `terraform -chdir=infra/terraform init -migrate-state`.

The deploy role has `AdministratorAccess` because Terraform creates IAM, Lambda, API Gateway, Cognito, DynamoDB, S3
and CloudFront resources. It is locked to this repo and branch; tighten it to a custom policy once things are stable.
Protect `main` (require pull requests) so only reviewed code can deploy.

### Custom domain (optional)

1. Request an ACM certificate for your domain **in `us-east-1`** (CloudFront requirement) and validate it.
2. Set `custom_domain` and `acm_certificate_arn` in `terraform.tfvars`, then apply.
3. Create a `CNAME`/alias record pointing your domain at the `cloudfront_domain` output.

### Remote state (recommended before more than one person deploys)

`infra/bootstrap` creates the state bucket and lock table for you (see *Deploy from GitHub*). Then run
`scripts/use-remote-state.sh <bucket> <table> <region>` and `terraform -chdir=infra/terraform init -migrate-state`.

## Local development (no AWS needed)

```bash
scripts/dev-config.sh local                 # web/public/config.json with devMode
(cd backend && npm ci && npm run dev:api)   # mock API on :8787 (in-memory data)
(cd web && npm ci && npm run dev)           # http://localhost:5173 — any email/password works
```

To develop the UI against your real deployed backend instead, run `scripts/dev-config.sh` (no argument) after a
`terraform apply`; `http://localhost:5173` is already allowed by the API's CORS settings.

Tests and checks: `cd backend && npm test && npm run typecheck`, `cd web && npm run build`.

## Email reminders

Reminders are optional and switched on by one Terraform variable. Amazon SES (AWS's email service) requires a few
one-time steps before it will email your members:

1. **Pick a sender address** you can receive mail at, e.g. `visionboard@yourchurch.org`, and set it in
   `infra/terraform/terraform.tfvars`:
   ```hcl
   reminder_from_email = "visionboard@yourchurch.org"
   reminder_timezone   = "Africa/Lagos"   # your timezone; default schedule is Mondays 07:00 in it
   ```
2. Run `./scripts/deploy.sh`. AWS emails a **verification link** to that address; click it.
3. **Ask AWS to move SES out of the sandbox** (SES console → *Account dashboard* → *Request production access*). Until
   that is approved (usually within a day), SES only delivers to addresses you have individually verified, so
   members will not receive reminders. Describe it as: “weekly check-in emails to registered members of our church
   app; members can opt out in the app.”
4. Optional but recommended: verify your whole domain in SES (adds DKIM so mail is less likely to land in spam), then
   set `create_ses_identity = false`.

Test it without waiting for Monday: Lambda console → `evincers-visionboard-prod-reminders` → *Test* (any JSON event).
Members who sign up are on the weekly list by default; each can switch to monthly or off in **Settings**.

## What it costs

Everything is pay-per-use, so a church-sized app costs very little. Rough monthly estimates from AWS list prices in
us-east-1 (check the [AWS Pricing Calculator](https://calculator.aws/) for your region; prices change):

| Members | Typical monthly cost | Notes |
| --- | --- | --- |
| ~100 | **$0–1** | Mostly inside the always-free tiers (Lambda, CloudFront, DynamoDB storage, Cognito) |
| ~500 | **$1–3** | ~2,200 reminder emails/month ≈ $0.22; a little API Gateway, DynamoDB and log storage |
| ~2,000 | **$3–8** | ~8,700 emails ≈ $0.87; API requests and DynamoDB still only cents |

The only line items that are not free-tier-dependent are small: API Gateway (about $1 per million requests), DynamoDB
on-demand reads/writes and point-in-time-recovery backups (cents), SES email ($0.10 per 1,000), CloudWatch logs
(30-day retention) and S3/CloudFront data transfer. Set `budget_email` in `terraform.tfvars` and AWS will email you if
the account's monthly spend is forecast to pass `monthly_budget_usd` (default $10). A custom domain adds $0.50/month if
you host its DNS in Route 53; the certificate is free.

## Before you launch to the whole church

These are deliberate defaults for getting started; tighten them for a real rollout.

- **Email sending:** Cognito's built-in sender is limited to ~50 emails/day. Verify a domain in Amazon SES and switch
  `email_configuration` in `cognito.tf` to `DEVELOPER` so sign-up codes reliably arrive.
- **Who can sign up:** `allow_self_signup = true` means anyone with the URL can register. Options: set it to `false` and
  invite people from the Cognito console, or add a Cognito *pre sign-up* Lambda that requires a church invite code.
- **Protect the data:** set `table_deletion_protection = true` (and `deletion_protection = "ACTIVE"` on the user pool)
  once real members' data exists. Point-in-time recovery is already on.
- **Remote Terraform state** (above) and a **budget alert** in AWS Billing.
- **Moderation:** shared visions are free text visible to all signed-in members. Consider a Cognito `admin` group plus
  a “hide/remove” action before opening sharing widely.

Cost: everything is pay-per-use. At the scale of a single church this should sit comfortably inside AWS free tiers /
a few dollars a month at most — check current pricing for your region.

## Roadmap ideas

“Praying for you” reactions on shared visions · vision cover images (S3 presigned uploads) · recurring habits ·
SMS/WhatsApp or push reminders · small-group boards and shared accountability partners · admin dashboard and moderation ·
year-end Write-Up generated from the whole year's data.
