import { getDb } from "@/db/client";
import { listResults, formatDuration } from "@/lib/results";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-accent-soft text-accent",
  expired: "bg-bg text-muted",
  in_progress: "bg-yellow-100 text-yellow-800",
};

export default async function ResultsPage() {
  const db = await getDb();
  const results = await listResults(db);

  return (
    <main>
      <h1 className="text-xl font-semibold">Results</h1>
      <p className="mt-1 text-sm text-muted">
        Scores and time are computed on the server. Flags are advisory and for
        human review.
      </p>

      <div className="mt-6 overflow-x-auto rounded-card border border-line">
        <table className="w-full text-sm">
          <thead className="bg-bg text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2">Candidate</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Test date</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Time taken</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Flags</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-4 py-2 font-medium">{r.candidateName}</td>
                <td className="px-4 py-2 text-muted">{r.candidateEmail}</td>
                <td className="px-4 py-2 text-muted">
                  {fmtDate(r.submittedAt ?? r.createdAt)}
                </td>
                <td className="px-4 py-2 font-mono">
                  {r.rawScore == null ? "—" : `${r.rawScore}/${r.total}`}
                </td>
                <td className="px-4 py-2 font-mono">
                  {formatDuration(r.totalTimeMs)}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}
                  >
                    {r.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    {r.flaggedForReview && (
                      <span
                        title="Left the test window"
                        className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700"
                      >
                        ⚠ blur
                      </span>
                    )}
                    {r.overTime && (
                      <span
                        title="Submitted after the time limit"
                        className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-semibold text-orange-700"
                      >
                        over time
                      </span>
                    )}
                    {!r.flaggedForReview && !r.overTime && (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={7}>
                  No results yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
