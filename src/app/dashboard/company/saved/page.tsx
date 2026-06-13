"use client";

import { useEffect, useState } from "react";
import { Bookmark, Search } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { CandidateSummaryCard } from "@/components/dashboard/candidate-summary-card";
import { MarketplaceEmptyState } from "@/components/dashboard/marketplace-empty-state";
import { getRecruiterShortlist, recruiterMarketplaceErrorMessage } from "@/lib/api/recruiter-marketplace-service";
import { RecruiterCandidateSearchItem } from "@/lib/api/types";

export default function SavedCandidatesPage() {
  const [items, setItems] = useState<RecruiterCandidateSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getRecruiterShortlist();
        if (!cancelled) setItems(response.items);
      } catch (requestError) {
        if (!cancelled) setError(recruiterMarketplaceErrorMessage(requestError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-4 py-8 md:px-8">
      <Breadcrumbs backHref="/dashboard/company" items={[{ label: "Company Dashboard", href: "/dashboard/company" }, { label: "Shortlist" }]} />
      <section className="rounded-[18px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
          <Bookmark className="h-3.5 w-3.5" />
          Recruiter shortlist
        </div>
        <h1 className="text-[30px] font-bold text-[var(--color-text-primary)]">Saved Candidates</h1>
        <p className="mt-2 text-[15px] leading-7 text-[var(--color-text-secondary)]">
          Manage verified candidates saved by the current recruiter account.
        </p>
      </section>

      {loading ? (
        <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-6 text-[14px] font-semibold text-[var(--color-text-secondary)]">Loading shortlist...</div>
      ) : error ? (
        <MarketplaceEmptyState icon={Search} title="Shortlist unavailable" description={error} />
      ) : items.length > 0 ? (
        <section className="space-y-4">
          {items.map((candidate) => (
            <CandidateSummaryCard key={candidate.candidate_id} candidate={candidate} />
          ))}
        </section>
      ) : (
        <MarketplaceEmptyState icon={Search} title="No shortlisted candidates yet." description="Shortlist candidates from semantic search or profile pages to compare and invite them here." actionHref="/dashboard/company/search" actionLabel="Discover candidates" />
      )}
    </main>
  );
}
