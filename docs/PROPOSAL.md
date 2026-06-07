# Proposal — Cognitive Screening Web App (ICAR)

Hi,

Instead of just pitching, I built out your spec so you can actually use it:

- Live app: https://icar-sigma.vercel.app/
- Code: https://github.com/mohamed-gudle/icar

It's Next.js (App Router) + TypeScript + Tailwind on the front, Cloud SQL (Postgres)
for data, Firebase Auth and Storage, with Drizzle for the schema and migrations. I'm
happy to share an admin login and a sample candidate link so you can take the test
yourself.

Up front: I used Claude Code to move fast on the boilerplate and first drafts. I've
been doing full-stack work for years and have solid Google Cloud experience, so the
architecture, the security model, and the code review are mine — the tool just saved
me typing. I mention it because how a screening test handles integrity is the whole
job, and I'd rather you trust the decisions than the keystrokes.

What's working right now:

- Candidates enter through a tokenized link (`/test?token=…`) that's checked against
  the DB before anything loads. Twelve questions pulled from an admin-managed pool,
  one at a time, covering all three ICAR types you listed (matrix reasoning, 3D
  rotation, letter/number series).
- No going back — once they continue, the answer is locked on the server (a uniqueness
  constraint on the row, not just a disabled button).
- 12-minute timer that auto-submits at zero, plus the blur/tab-switch listener that
  ends the test. The important part is that none of the timing is trusted from the
  browser: the start time is written to Cloud SQL on init and the elapsed time is
  recomputed and validated server-side, so reloading or messing with the clock
  doesn't buy anyone more time.
- Admin side: manage the question pool, upload images, set the answer keys, and mint
  single-use, expiring tokens. The results table shows name, email, date, score out
  of 12, total time (calculated server-side), and a flag if they triggered the blur
  warning.

A couple of things I was deliberate about, since they're where these apps usually
get sloppy: the access tokens are single-use and consumed with one atomic SQL update,
so a candidate can't open two tabs and start twice; and scoring happens entirely on
the server — the correct answers never get sent to the browser.

On your three questions:

1. Connecting to Cloud SQL securely — I use Google's cloud-sql-connector with the pg
   pool and IAM database auth, so there's no long-lived DB password floating around;
   secrets come from Secret Manager, and the pool is kept small for serverless. That
   approach is the same whether the code runs as Cloud Functions V2 or on Cloud Run.
   One honest heads-up: my build runs the API as Next.js route handlers rather than as
   separate Cloud Functions V2. I think that's the better call here and I've explained
   why below — but if you want the discrete Functions topology, I'm comfortable building
   it that way and the database and auth design don't change.

2. Code's all in the repo above, fully typed, with tests over the parts that matter
   (the token race, the answer lock, the timer, scoring). Happy to walk you through a
   live deployment.

3. Timeline — it's basically there. Give me access to your GCP/Firebase project and I
   can have it provisioned, deployed, and validated in your environment in about 3–5
   business days, including a hardening pass.

On Cloud Functions vs. keeping this one Next.js app:

Since your brief leans toward a Cloud Functions backend, I want to make the case for
why I'd keep the API inside the Next.js app — and it's not to dodge the work, it's the
choice I'd defend in production.

You don't actually lose "serverless" by staying in Next.js. On Firebase it deploys
through App Hosting, which runs on Cloud Run — the same platform Cloud Functions V2 is
built on. Same autoscaling, same scale-to-zero, same Cloud SQL connector and IAM auth.
So the real question isn't server vs. serverless, it's one deployable vs. many, and for
an app this size one is better:

- One codebase, shared types. The shape the API returns is the exact type the UI
  renders — a breaking change won't even compile. Split behind an HTTP boundary and
  those contracts drift, and the frontend and a separate backend can get deployed out
  of sync. Here that can't happen.
- One security boundary. The parts that matter — single-use token consumption, the
  server-validated timer, answer locking, scoring — live together over one session and
  DB layer. Split into separate functions and you re-verify auth at every function's
  edge and add CORS between origins, which is more surface for exactly the mistakes a
  screening test can't make.
- Less to run. One set of secrets, one log stream, one thing to roll back — not a
  hosting deploy plus a fleet of functions to keep in step.

For the load this sees — a short test taken by candidates, not a high-traffic public
API — a separate Functions backend is complexity without a payoff. Where Functions do
earn their place is isolated, separately-scaled, or event-driven work: a scheduled job,
image processing, a webhook. If you'd like the abandoned-session cleanup to run as its
own scheduled Cloud Function, that's exactly the kind of piece I'd peel out — but the
request/response flow for the test itself belongs with the app. Cloud Functions for
background jobs, one Next.js app on Cloud Run for the typed, security-sensitive request
path.

Two suggestions I'd make: I went with Firebase Auth and an admin claim instead of a
single shared password — you get real accounts and revocation, and it's easy to
simplify if you'd rather. And since ICAR items are public, I'd rotate the question
bank over time and treat the blur flag as something a human reviews rather than an
automatic fail, because any front-end anti-cheat is only a signal — the server is
where the real enforcement is.

Glad to jump on a quick call and demo it.

— Mohamed
