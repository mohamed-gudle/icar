"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ICAR_TYPES, type IcarType } from "@/lib/config";

const KEYS = ["A", "B", "C", "D", "E", "F"];

type OptionDraft = { key: string; text: string; imagePath: string };

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/assets", { method: "POST", body: fd });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? "upload failed");
  }
  return (await res.json()).path as string;
}

export function QuestionForm() {
  const router = useRouter();
  const [type, setType] = useState<IcarType>("series");
  const [stemText, setStemText] = useState("");
  const [stemImagePath, setStemImagePath] = useState("");
  const [count, setCount] = useState(4);
  const [options, setOptions] = useState<OptionDraft[]>(
    KEYS.slice(0, 4).map((k) => ({ key: k, text: "", imagePath: "" })),
  );
  const [correctKey, setCorrectKey] = useState("A");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const isSeries = type === "series";
  const visibleOptions = useMemo(() => options.slice(0, count), [options, count]);

  function setCountClamped(n: number) {
    const c = Math.max(4, Math.min(6, n));
    setCount(c);
    setOptions((prev) => {
      const next = [...prev];
      while (next.length < c)
        next.push({ key: KEYS[next.length], text: "", imagePath: "" });
      return next.slice(0, 6);
    });
    if (KEYS.indexOf(correctKey) >= c) setCorrectKey("A");
  }

  function updateOption(i: number, patch: Partial<OptionDraft>) {
    setOptions((prev) =>
      prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    );
  }

  async function onStemFile(file: File) {
    setError(null);
    try {
      setStemImagePath(await uploadFile(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload failed");
    }
  }

  async function onOptionFile(i: number, file: File) {
    setError(null);
    try {
      const path = await uploadFile(file);
      updateOption(i, { imagePath: path });
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload failed");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      const payload = {
        type,
        stemText: isSeries ? stemText : null,
        stemImagePath: isSeries ? null : stemImagePath,
        options: visibleOptions.map((o) => ({
          key: o.key,
          text: o.text || undefined,
          imagePath: o.imagePath || undefined,
        })),
        correctOptionKey: correctKey,
        numOptions: count,
      };
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "could not save");
      }
      setOk(true);
      setStemText("");
      setStemImagePath("");
      setOptions(KEYS.slice(0, 4).map((k) => ({ key: k, text: "", imagePath: "" })));
      setCount(4);
      setCorrectKey("A");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-card border border-line bg-card p-5"
    >
      <div className="flex flex-wrap gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as IcarType)}
            className="rounded-md border border-line px-3 py-2"
          >
            {ICAR_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold">Options</span>
          <input
            type="number"
            min={4}
            max={6}
            value={count}
            onChange={(e) => setCountClamped(Number(e.target.value))}
            className="w-20 rounded-md border border-line px-3 py-2"
          />
        </label>
      </div>

      {isSeries ? (
        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-semibold">Sequence (stem text)</span>
          <input
            value={stemText}
            onChange={(e) => setStemText(e.target.value)}
            placeholder="A, C, E, G, __"
            className="w-full rounded-md border border-line px-3 py-2 font-mono"
          />
        </label>
      ) : (
        <div className="mt-4 text-sm">
          <span className="mb-1 block font-semibold">Stem image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files?.[0] && onStemFile(e.target.files[0])
            }
          />
          {stemImagePath && (
            <span className="ml-2 text-xs text-muted">✓ {stemImagePath}</span>
          )}
        </div>
      )}

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-semibold">Options</legend>
        <div className="space-y-2">
          {visibleOptions.map((o, i) => (
            <div key={o.key} className="flex items-center gap-3 text-sm">
              <span className="w-5 font-mono font-bold">{o.key}</span>
              {isSeries ? (
                <input
                  value={o.text}
                  onChange={(e) => updateOption(i, { text: e.target.value })}
                  placeholder="answer text"
                  className="flex-1 rounded-md border border-line px-3 py-1.5 font-mono"
                />
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files?.[0] && onOptionFile(i, e.target.files[0])
                    }
                  />
                  {o.imagePath && (
                    <span className="text-xs text-muted">✓</span>
                  )}
                </>
              )}
              <label className="flex items-center gap-1 text-xs text-muted">
                <input
                  type="radio"
                  name="correct"
                  checked={correctKey === o.key}
                  onChange={() => setCorrectKey(o.key)}
                />
                correct
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {ok && <p className="mt-4 text-sm text-green-600">Question saved.</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 rounded-md bg-accent px-5 py-2 font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Add question"}
      </button>
    </form>
  );
}
