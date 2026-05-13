export default function AnalyticsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-6 p-8">
      <div>
        <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">Recruiter Analytics</h1>
        <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">Demo view for search performance, candidate response rates, and marketplace activity.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Searches", "14"],
          ["Invites sent", "6"],
          ["Acceptance rate", "67%"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[14px] border border-[var(--color-border)] bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</p>
            <p className="mt-3 text-3xl font-bold text-[var(--color-text-primary)]">{value}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
