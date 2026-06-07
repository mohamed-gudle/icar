"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TokenForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [expiryDays, setExpiryDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setLink(null);
    setCopied(false);
    try {
      const res = await fetch("/api/admin/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: name,
          candidateEmail: email,
          expiryDays,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "could not generate token");
      }
      const { inviteUrl } = await res.json();
      setLink(inviteUrl);
      setName("");
      setEmail("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not generate token");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
  }

  return (
    <div className="rounded-card border border-line bg-card p-5">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Candidate name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-line px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-line px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Expires (days)</span>
          <input
            type="number"
            min={1}
            max={90}
            value={expiryDays}
            onChange={(e) => setExpiryDays(Number(e.target.value))}
            className="w-24 rounded-md border border-line px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-5 py-2 font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Generating…" : "Generate link"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {link && (
        <div className="mt-5 rounded-md border border-accent-soft bg-accent-soft/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Invite link — copy it now, it is shown only once
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded border border-line bg-white px-3 py-2 text-xs">
              {link}
            </code>
            <button
              onClick={copy}
              className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
