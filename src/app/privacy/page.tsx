import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] px-6 py-16 text-[var(--color-text-primary)]">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-[var(--color-accent)]">XLR8Hire</Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-[var(--color-text-secondary)]">
          This demo stores only local mock state in your browser, including selected role, demo performance, saved candidates, profile publishing, and interview requests.
        </p>
        <div className="mt-10 space-y-6 text-sm leading-7 text-[var(--color-text-secondary)]">
          <p>No production backend, external identity provider, or real recruiter communication is connected in this prototype.</p>
          <p>Clearing browser localStorage resets the marketplace demo state.</p>
        </div>
      </div>
    </main>
  );
}
