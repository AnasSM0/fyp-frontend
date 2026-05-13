import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] px-6 py-16 text-[var(--color-text-primary)]">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-[var(--color-accent)]">XLR8Hire</Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-4 text-[var(--color-text-secondary)]">
          Demo terms for the FYP prototype. XLR8Hire currently uses mock assessment, marketplace, and recruiter request data for demonstration only.
        </p>
        <div className="mt-10 space-y-6 text-sm leading-7 text-[var(--color-text-secondary)]">
          <p>Users should treat all scores, candidate rankings, recruiter requests, and AI insights as simulated product experiences.</p>
          <p>No real hiring, payment, identity verification, or employment decision is performed by this prototype.</p>
        </div>
      </div>
    </main>
  );
}
