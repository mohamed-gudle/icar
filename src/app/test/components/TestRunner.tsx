"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionState } from "@/lib/session";
import { Timer } from "./Timer";
import { QuestionRenderer } from "./QuestionRenderer";
import { CompletionScreen } from "./CompletionScreen";
import { InvalidTokenScreen } from "./InvalidTokenScreen";

type Phase =
  | "loading"
  | "active"
  | "done"
  | "invalid"
  | "expired"
  | "completed";

type DoneReason = "submitted" | "expired" | "blur";

async function postJson(url: string, body?: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    keepalive: true,
  });
}

export function TestRunner({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [state, setState] = useState<SessionState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [doneReason, setDoneReason] = useState<DoneReason>("submitted");

  const submittedRef = useRef(false);
  const armedAt = useRef<number>(0);

  // --- finalize (guarded against double submit) ---
  const submit = useCallback(async (reason: DoneReason) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      await postJson("/api/session/submit");
    } catch {
      /* best effort; server sweep finalizes regardless */
    }
    setDoneReason(reason);
    setPhase("done");
  }, []);

  // --- initialize / resume on mount ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await postJson("/api/session/init", { token });
      if (cancelled) return;
      if (res.ok) {
        const { state: s } = await res.json();
        setState(s as SessionState);
        if ((s as SessionState).status !== "in_progress") {
          setPhase("completed");
        } else {
          armedAt.current = performance.now();
          setPhase("active");
        }
        return;
      }
      if (res.status === 410) setPhase("expired");
      else if (res.status === 409) setPhase("completed");
      else setPhase("invalid");
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // --- anti-cheat: immediate submit on leaving the window/tab ---
  useEffect(() => {
    if (phase !== "active") return;

    const recent = () => performance.now() - armedAt.current < 800; // ignore load-time blur

    const onBlur = () => {
      if (recent()) return;
      void postJson("/api/proctoring", { type: "blur" });
      void submit("blur");
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void postJson("/api/proctoring", { type: "visibility_hidden" });
        if (!recent()) void submit("blur");
      } else {
        void postJson("/api/proctoring", { type: "visibility_visible" });
      }
    };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [phase, submit]);

  // --- advance to the next question (or finish) ---
  const handleNext = useCallback(async () => {
    if (!state?.question || !selected || busy) return;
    setBusy(true);
    try {
      const res = await postJson("/api/session/answer", {
        questionId: state.question.id,
        optionKey: selected,
      });
      if (res.status === 410) {
        await submit("expired");
        return;
      }
      if (!res.ok) {
        // Out-of-order / already-answered / not-in-progress: resync from server.
        const st = await fetch("/api/session/state").then((r) =>
          r.ok ? r.json() : null,
        );
        if (st?.state) setState(st.state as SessionState);
        return;
      }
      const { done } = await res.json();
      if (done) {
        await submit("submitted");
        return;
      }
      const st = await fetch("/api/session/state").then((r) => r.json());
      setState(st.state as SessionState);
      setSelected(null);
    } finally {
      setBusy(false);
    }
  }, [state, selected, busy, submit]);

  const onExpire = useCallback(() => {
    void submit("expired");
  }, [submit]);

  // --- render ---
  if (phase === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading your test…
      </main>
    );
  }
  if (phase === "invalid") {
    return (
      <InvalidTokenScreen
        title="Invalid link"
        message="This test link is not valid. Please check the link from your email."
      />
    );
  }
  if (phase === "expired") {
    return (
      <InvalidTokenScreen
        title="Link expired"
        message="This invitation has expired. Please contact the recruiter for a new link."
      />
    );
  }
  if (phase === "completed") {
    return (
      <InvalidTokenScreen
        title="Already completed"
        message="This test has already been taken and cannot be retaken."
      />
    );
  }
  if (phase === "done") {
    return <CompletionScreen reason={doneReason} />;
  }

  // active
  if (!state?.question) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted">
        Preparing question…
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-[720px] px-5 py-10">
      <div className="mb-6 flex items-center justify-between rounded-card border border-line bg-card px-5 py-3.5">
        <span className="text-xs font-semibold text-muted">
          Cognitive screening
        </span>
        <Timer remainingMs={state.remainingMs} onExpire={onExpire} />
      </div>
      <QuestionRenderer
        question={state.question}
        index={state.index}
        total={state.total}
        selected={selected}
        onSelect={setSelected}
        onNext={handleNext}
        busy={busy}
      />
    </main>
  );
}
