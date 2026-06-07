# Proposal (short)

Hi,

Rather than pitch, I built your spec so you can use it:

- Live: https://icar-sigma.vercel.app/
- Code: https://github.com/mohamed-gudle/icar

It's a fully-typed Next.js (App Router) + TypeScript + Tailwind app on Cloud SQL
(Postgres), with Firebase Auth and Storage. Candidates enter through a single-use
tokenized link, take 12 ICAR questions (matrix, 3D rotation, letter/number series)
one at a time with no back-navigation and a 12-minute timer. The admin side manages
the question pool, mints expiring tokens, and shows a results table with score, time,
and the blur flag.

The integrity bits are all server-side, which is the actual point of a screening test:
the timer is validated against a start time in Cloud SQL (reloading doesn't buy more
time), tokens are single-use via one atomic SQL update (no two-tab starts), and scoring
happens on the server so answer keys never reach the browser.

On your questions: I connect to Cloud SQL with Google's connector and IAM auth (no
stored DB password, secrets in Secret Manager) — same pattern on Cloud Functions or
Cloud Run. I kept the API in the Next.js app rather than separate Cloud Functions so the
UI and API share types and one auth boundary; happy to split it if you'd rather. Code's
in the repo with tests on the critical paths. Timeline: it's basically done — with
access to your GCP project, deployed and validated in your environment in 3–5 days.

For honesty: I used Claude Code to speed up the build. I've got years of full-stack and
solid Google Cloud experience, so the architecture and security calls are mine.

Happy to demo live and hand over an admin login.

— Mohamed
