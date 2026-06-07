export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col justify-center px-5 py-10">
      <div className="rounded-card border border-line bg-card p-8">
        <h1 className="text-xl font-semibold">Cognitive Screening</h1>
        <p className="mt-3 text-sm text-muted">
          This is a private assessment platform. Candidates receive a unique test
          link by email. If you have a link, open it to begin.
        </p>
        <p className="mt-6 text-sm text-muted">
          Administrators can sign in at{" "}
          <a className="font-semibold text-accent" href="/admin">
            /admin
          </a>
          .
        </p>
      </div>
    </main>
  );
}
