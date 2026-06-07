# Setup & Deployment Runbook

> **Cheapest path (recommended): use Neon for Postgres instead of Cloud SQL.**
> Cloud SQL bills ~$10/mo even when idle. Neon's free tier is $0 and the code
> supports it with zero changes. See **§0** below — you can then skip §2 and §6,
> and only use Firebase for Hosting/Auth/Storage (all free at this scale).

## 0. Option: Neon (free serverless Postgres) instead of Cloud SQL

1. Create a free project at https://neon.tech and a database named `screening`.
2. Copy the connection string (includes `?sslmode=require`).
3. Local dev / migrations / tests:
   ```bash
   export DATABASE_URL="postgresql://USER:PASS@ep-xxx.REGION.aws.neon.tech/screening?sslmode=require"
   npm run db:migrate     # apply schema to Neon
   npm test               # gated DB integration tests now run against Neon
   ```
4. For the deployed app, set the same `DATABASE_URL` as an App Hosting secret
   (instead of the `CLOUD_SQL_INSTANCE`/`DB_IAM_USER` vars). I'll wire this in
   `apphosting.yaml`. The app auto-enables SSL for non-localhost hosts.

That's the entire database setup — **$0, no Cloud SQL instance, no IAM DB user,
no VPC, no Auth Proxy.** Sections 2 and 6 below are only for the Cloud SQL route.

---


Provision GCP/Firebase, wire local dev, then deploy to App Hosting. Run the
`gcloud`/`firebase` commands yourself (they touch your project + billing), then
send me the values marked **→ send me** and I'll finalize config + deploy.

Set these shell vars first (pick your own names):

```bash
export PROJECT=your-project-id
export REGION=us-central1
export INSTANCE=screening-db
export DB=screening
```

## Deploying on Vercel (no GCP billing, no Firebase Hosting)

This is the fully-free path: **Vercel** (host) + **Neon** (DB) + **Firebase Auth**
(Storage optional). `apphosting.yaml`, and sections 1/2/5/6/7/9 below, are only for
the Firebase App Hosting route and can be ignored.

1. Push this repo to GitHub and import it at https://vercel.com/new (framework
   auto-detected as Next.js — no build config needed).
2. Set **Environment Variables** in the Vercel project (Settings → Environment
   Variables). Mark them for Production + Preview:

   | Var | Value |
   |-----|-------|
   | `DATABASE_URL` | your Neon connection string (`...sslmode=require`) |
   | `NEXT_PUBLIC_FIREBASE_CONFIG` | the web-app config JSON (one line) |
   | `FIREBASE_PROJECT_ID` | `icar-b1d82` |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | the **entire** service-account key JSON, pasted as one line (serverless can't read a key file) |
   | `CANDIDATE_COOKIE_SECRET` | random 32-byte hex |
   | `SWEEP_SECRET` | random 32-byte hex |
   | `CRON_SECRET` | **same value as** `SWEEP_SECRET` (Vercel Cron sends it as the `Authorization: Bearer` header) |
   | `FIREBASE_STORAGE_BUCKET` | only if you enable Storage later |

3. Run migrations against Neon once from your machine (`DATABASE_URL=... npm run db:migrate`).
4. The cron in `vercel.json` calls `/api/cron/sweep` every 5 min to finalize
   abandoned tests — it authenticates via `CRON_SECRET` automatically.
5. Grant yourself admin: `GOOGLE_APPLICATION_CREDENTIALS=./sa-key.json npm run set-admin -- you@email.com`
   (run locally with the key file), then sign in at `/admin`.

> Get the `FIREBASE_SERVICE_ACCOUNT_JSON` value: Firebase Console → Project
> Settings → Service accounts → Generate new private key → open the file and
> paste its full contents into the Vercel env var.

---

## 1. Enable APIs

```bash
gcloud config set project $PROJECT
gcloud services enable \
  run.googleapis.com cloudbuild.googleapis.com \
  sqladmin.googleapis.com secretmanager.googleapis.com \
  firebasestorage.googleapis.com identitytoolkit.googleapis.com
```

## 2. Cloud SQL (Postgres) with IAM auth

```bash
gcloud sql instances create $INSTANCE \
  --database-version=POSTGRES_16 --tier=db-f1-micro --region=$REGION \
  --database-flags=cloudsql.iam_authentication=on
gcloud sql databases create $DB --instance=$INSTANCE
gcloud sql instances describe $INSTANCE --format="value(connectionName)"
```

→ **send me** the `connectionName` (looks like `proj:region:instance`).

## 3. Firebase: Auth, Storage, web app

In the Firebase console (or CLI):
- **Authentication → Sign-in method →** enable **Email/Password**.
- **Storage →** create the default bucket (note its name, e.g. `proj.firebasestorage.app`).
- **Project settings → Your apps →** create a **Web app**; copy its config object.

```bash
firebase login
firebase use $PROJECT
firebase deploy --only storage   # publishes the closed storage.rules in this repo
```

→ **send me** the **web app config** JSON and the **bucket name**.

## 4. Secrets (Secret Manager)

```bash
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets create sweepSecret --data-file=-
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets create candidateCookieSecret --data-file=-
```

(`apphosting.yaml` already references these two secret names.)

## 5. Service account / IAM

App Hosting runs as a service account that needs DB + Storage access. After the
first App Hosting backend exists (step 7), grant its runtime SA:

```bash
# SA email is shown in the App Hosting backend settings; export it:
export SA=service-account-email@$PROJECT.iam.gserviceaccount.com

gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA" --role="roles/cloudsql.client"
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA" --role="roles/cloudsql.instanceUser"
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA" --role="roles/storage.objectAdmin"
gcloud secrets add-iam-policy-binding sweepSecret --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding candidateCookieSecret --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"

# Create the IAM DB user for that SA (strip the .gserviceaccount.com suffix):
gcloud sql users create "${SA%.gserviceaccount.com}" --instance=$INSTANCE --type=cloud_iam_service_account
```

→ **send me** the runtime SA email (this becomes `DB_IAM_USER`, suffix stripped).

## 6. Run migrations (once, from your machine via the Auth Proxy)

```bash
# Terminal A: proxy the instance
./cloud-sql-proxy $PROJECT:$REGION:$INSTANCE --port 5432
# Terminal B:
export MIGRATION_DATABASE_URL="postgres://USER:PASS@localhost:5432/$DB"  # or a temp password user
npm run db:migrate
```

(Or just point `LOCAL_DATABASE_URL` at any Postgres for local dev/testing.)

## 7. Deploy to App Hosting

```bash
firebase apphosting:backends:create --location=$REGION
git push   # connect the repo in the console, or use the CLI rollout
```

Then fill the real values into `apphosting.yaml` env (replace every `REPLACE_ME`)
and configure VPC egress if using private IP. **I'll do this step** once you send
the values above.

## 8. First admin

```bash
# After a user signs up via the app's /admin/login once (or create one in console):
GOOGLE_APPLICATION_CREDENTIALS=./sa-key.json npm run set-admin -- you@email.com
```

## 9. Cron sweep (finalize abandoned tests)

```bash
gcloud scheduler jobs create http sweep-expired \
  --location=$REGION --schedule="*/5 * * * *" \
  --uri="https://YOUR_APP_HOSTING_URL/api/cron/sweep" --http-method=POST \
  --headers="x-sweep-secret=THE_SWEEP_SECRET_VALUE"
```

---

## What to send me

1. Cloud SQL `connectionName`
2. Firebase web app config JSON + Storage bucket name
3. Runtime SA email (for `DB_IAM_USER`)
4. Your App Hosting URL (after step 7) — for the cron job

With those I'll fill in `apphosting.yaml`, wire `.env` references, and verify the
deploy + run the gated DB integration tests against the instance.
