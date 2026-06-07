"use client";

import type { ClientQuestion } from "@/lib/session";
import { AssetImage } from "./AssetImage";
import { QuestionStem, typeLabel, typePrompt } from "./items";

export function QuestionRenderer({
  question,
  index,
  total,
  selected,
  onSelect,
  onNext,
  busy,
}: {
  question: ClientQuestion;
  index: number; // zero-based
  total: number;
  selected: string | null;
  onSelect: (key: string) => void;
  onNext: () => void;
  busy: boolean;
}) {
  const isLast = index + 1 >= total;
  const progress = Math.round(((index + 1) / total) * 100);

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Question {index + 1} of {total} · {typeLabel(question.type)}
      </div>
      <div className="mb-6 h-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h2 className="mb-4 text-base font-semibold">{typePrompt(question.type)}</h2>

      <QuestionStem question={question} />

      <div className="mb-3 mt-7 text-xs font-semibold uppercase tracking-wide text-muted">
        Choose one
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {question.options.map((opt) => {
          const active = selected === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onSelect(opt.key)}
              aria-pressed={active}
              className={`relative flex aspect-square items-center justify-center rounded-xl border bg-card p-3 transition-all ${
                active
                  ? "border-accent shadow-[0_0_0_3px_var(--accent-soft)]"
                  : "border-line hover:border-accent"
              }`}
            >
              <span className="absolute left-2.5 top-2 text-xs font-bold text-muted">
                {opt.key}
              </span>
              {opt.imagePath ? (
                <AssetImage
                  path={opt.imagePath}
                  alt={`Option ${opt.key}`}
                  className="max-h-[70%] max-w-[70%]"
                />
              ) : (
                <span className="font-mono text-xl">{opt.text}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-7 flex items-center justify-between">
        <span className="text-xs text-muted">
          No going back — your answer locks when you continue.
        </span>
        <button
          type="button"
          disabled={!selected || busy}
          onClick={onNext}
          className="rounded-lg bg-accent px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : isLast ? "Finish" : "Next →"}
        </button>
      </div>
    </div>
  );
}
