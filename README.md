# Cognitive Screening Web App (ICAR)

A lightweight, secure, self-hosted cognitive screening test for recruiting, built on
Next.js (App Router) + Firebase App Hosting + GCP Cloud SQL (Postgres).

- **Candidate interface** — token-gated, 12-question ICAR test (matrix reasoning, 3D
  rotation, letter/number series), one question at a time, no back-navigation, a
  12-minute server-authoritative timer, auto-submit at zero, and immediate submit on
  window blur.
- **Admin dashboard** — Firebase Auth protected; manage the question pool, upload
  visual assets, generate single-use expiring invite tokens, and review results.

See [the implementation plan](docs/plans/2026-06-07-001-feat-cognitive-screening-app-plan.md)
for the full design and rationale.

## Architecture

All integrity-critical decisions are server-authoritative and live in Cloud SQL:

- Timer anchored to a one-shot server `started_at`; elapsed validated on submit.
- Single-use tokens consumed via an atomic conditional `UPDATE ... RETURNING`.
- Answers persisted first-write-wins per `(session, question)` — the no-back-nav lock.
- Scoring done on the server; correct answer keys are never sent to the client.
- A scheduled sweep finalizes abandoned/expired sessions.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
# Pure-logic tests run with no external services:
npm test
```

DB and Firebase integration require a Postgres instance (or the Cloud SQL proxy) and a
Firebase project. See `.env.example`.

### Database migrations

```bash
npm run db:generate   # generate SQL from src/db/schema.ts
npm run db:migrate    # apply (run as a CI/CD step, never at runtime)
```

### Granting an admin

Admin access is gated by an `admin` Firebase custom claim:

```bash
npm run set-admin -- user@example.com
```

## Deployment

Deploys on **Firebase App Hosting** (Cloud Run under the hood). Configure
`apphosting.yaml`, grant the runtime service account `roles/cloudsql.client` +
`roles/cloudsql.instanceUser` + Storage access, and set secrets in Cloud Secret Manager.

## Testing boundary

Pure-logic units (scoring, timer, token hashing, question selection) are covered by
`vitest` and run anywhere. Integration tests that touch Postgres/Firebase are marked and
require the corresponding service to be available.
