import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdmin } from "@/lib/auth";
import { SignOutButton } from "../sign-out-button";

/**
 * Real server-side authorization boundary for the admin dashboard.
 * The middleware only does a cookie-presence check; this verifies the
 * session cookie and the admin claim with the Admin SDK on every request.
 * Login lives outside this route group so it is not gated.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-5 py-8">
      <header className="mb-8 flex items-center justify-between border-b border-line pb-4">
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <Link href="/admin" className="text-ink">
            Dashboard
          </Link>
          <Link href="/admin/questions" className="text-muted hover:text-ink">
            Questions
          </Link>
          <Link href="/admin/tokens" className="text-muted hover:text-ink">
            Tokens
          </Link>
          <Link href="/admin/results" className="text-muted hover:text-ink">
            Results
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>{admin.email}</span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
