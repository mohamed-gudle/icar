"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ToggleActive({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [on, setOn] = useState(active);
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !on;
    start(async () => {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (res.ok) {
        setOn(next);
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
        on
          ? "bg-accent-soft text-accent"
          : "bg-bg text-muted line-through"
      }`}
    >
      {on ? "Active" : "Inactive"}
    </button>
  );
}
