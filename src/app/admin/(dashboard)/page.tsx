import Link from "next/link";

const cards = [
  {
    href: "/admin/questions",
    title: "Question pool",
    body: "Create and manage ICAR items, upload visual assets, set answer keys.",
  },
  {
    href: "/admin/tokens",
    title: "Candidate tokens",
    body: "Generate single-use, expiring invite links for candidates.",
  },
  {
    href: "/admin/results",
    title: "Results",
    body: "Review scores, time taken, and integrity flags.",
  },
];

export default function AdminHome() {
  return (
    <main>
      <h1 className="text-xl font-semibold">Admin dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-card border border-line bg-card p-5 transition-colors hover:border-accent"
          >
            <h2 className="font-semibold">{c.title}</h2>
            <p className="mt-2 text-sm text-muted">{c.body}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
