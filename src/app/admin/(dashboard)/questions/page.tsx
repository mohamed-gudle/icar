import { desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { questions } from "@/db/schema";
import { ICAR_TYPES, ITEMS_PER_TYPE } from "@/lib/config";
import { QuestionForm } from "./QuestionForm";
import { ToggleActive } from "./ToggleActive";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  matrix: "Matrix reasoning",
  rotation: "3D rotation",
  series: "Letter & number series",
};

export default async function QuestionsPage() {
  const db = await getDb();
  const rows = await db
    .select()
    .from(questions)
    .orderBy(desc(questions.createdAt))
    .limit(1000);

  const activeByType = Object.fromEntries(
    ICAR_TYPES.map((t) => [
      t,
      rows.filter((r) => r.type === t && r.active).length,
    ]),
  );

  return (
    <main>
      <h1 className="text-xl font-semibold">Question pool</h1>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {ICAR_TYPES.map((t) => {
          const count = activeByType[t] ?? 0;
          const enough = count >= ITEMS_PER_TYPE;
          return (
            <div
              key={t}
              className="rounded-card border border-line bg-card p-4 text-sm"
            >
              <div className="font-semibold">{TYPE_LABEL[t]}</div>
              <div className={enough ? "text-muted" : "text-red-600"}>
                {count} active{" "}
                {enough ? "" : `(need ${ITEMS_PER_TYPE}+ to run tests)`}
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Add a question
        </h2>
        <QuestionForm />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          All questions ({rows.length})
        </h2>
        <div className="overflow-hidden rounded-card border border-line">
          <table className="w-full text-sm">
            <thead className="bg-bg text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Stem</th>
                <th className="px-4 py-2">Options</th>
                <th className="px-4 py-2">Key</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id} className="border-t border-line">
                  <td className="px-4 py-2">{TYPE_LABEL[q.type]}</td>
                  <td className="max-w-[220px] truncate px-4 py-2 text-muted">
                    {q.stemText ?? q.stemImagePath ?? "—"}
                  </td>
                  <td className="px-4 py-2">{q.numOptions}</td>
                  <td className="px-4 py-2 font-mono">{q.correctOptionKey}</td>
                  <td className="px-4 py-2">
                    <ToggleActive id={q.id} active={q.active} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-muted" colSpan={5}>
                    No questions yet.
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
