import { desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { accessTokens } from "@/db/schema";
import { TokenForm } from "./TokenForm";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 10);
}

const STATUS_STYLE: Record<string, string> = {
  unused: "bg-accent-soft text-accent",
  consumed: "bg-bg text-muted",
  expired: "bg-red-100 text-red-700",
};

export default async function TokensPage() {
  const db = await getDb();
  const rows = await db
    .select({
      id: accessTokens.id,
      candidateName: accessTokens.candidateName,
      candidateEmail: accessTokens.candidateEmail,
      status: accessTokens.status,
      expiresAt: accessTokens.expiresAt,
      consumedAt: accessTokens.consumedAt,
      createdAt: accessTokens.createdAt,
    })
    .from(accessTokens)
    .orderBy(desc(accessTokens.createdAt))
    .limit(500);

  const now = Date.now();

  return (
    <main>
      <h1 className="text-xl font-semibold">Candidate tokens</h1>

      <section className="mt-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Generate an invite
        </h2>
        <TokenForm />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Issued tokens ({rows.length})
        </h2>
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full text-sm">
            <thead className="bg-bg text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2">Candidate</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Expires</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const expired =
                  t.status === "unused" && t.expiresAt.getTime() < now;
                const status = expired ? "expired" : t.status;
                return (
                  <tr key={t.id} className="border-t border-line">
                    <td className="px-4 py-2 font-medium">{t.candidateName}</td>
                    <td className="px-4 py-2 text-muted">{t.candidateEmail}</td>
                    <td className="px-4 py-2 text-muted">
                      {fmtDate(t.expiresAt)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-muted" colSpan={4}>
                    No tokens issued yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
