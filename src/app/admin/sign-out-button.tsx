"use client";

import { useRouter } from "next/navigation";
import { clientAuth } from "@/lib/firebase-client";
import { signOut } from "firebase/auth";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut(clientAuth()).catch(() => {});
    await fetch("/api/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-md border border-line px-3 py-1 font-semibold text-ink hover:bg-bg"
    >
      Sign out
    </button>
  );
}
