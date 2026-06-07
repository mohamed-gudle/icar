export function CompletionScreen({
  reason,
}: {
  reason: "submitted" | "expired" | "blur";
}) {
  const message =
    reason === "blur"
      ? "Your test was submitted because you left the test window. Thank you for participating."
      : reason === "expired"
        ? "Time is up. Your answers have been submitted. Thank you for participating."
        : "Your responses have been submitted. Thank you for participating.";
  return (
    <main className="mx-auto flex min-h-screen max-w-[560px] flex-col justify-center px-5">
      <div className="rounded-card border border-line bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          ✓
        </div>
        <h1 className="text-lg font-semibold">Test complete</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <p className="mt-4 text-xs text-muted">You may now close this window.</p>
      </div>
    </main>
  );
}
