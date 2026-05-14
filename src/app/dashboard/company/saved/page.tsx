"use client";

import { Bookmark, Search } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { CandidateSummaryCard } from "@/components/dashboard/candidate-summary-card";
import { MarketplaceEmptyState } from "@/components/dashboard/marketplace-empty-state";
import { getCandidateById, MARKETPLACE_CANDIDATES } from "@/lib/mock-marketplace";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

export default function SavedCandidatesPage() {
  const { savedCandidateIds } = useMarketplaceStore();
  const savedCandidates = savedCandidateIds
    .map((candidateId) => getCandidateById(candidateId))
    .filter((candidate, index, candidates) => candidates.findIndex((item) => item.id === candidate.id) === index)
    .filter((candidate) => MARKETPLACE_CANDIDATES.some((item) => item.id === candidate.id));

  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-4 py-8 md:px-8">
      <Breadcrumbs
        backHref="/dashboard/company"
        items={[
          { label: "Company Dashboard", href: "/dashboard/company" },
          { label: "Shortlist" },
        ]}
      />
      <section className="rounded-[18px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
          <Bookmark className="h-3.5 w-3.5" />
          Recruiter shortlist
        </div>
        <h1 className="text-[30px] font-bold text-[var(--color-text-primary)]">Saved Candidates</h1>
        <p className="mt-2 text-[15px] leading-7 text-[var(--color-text-secondary)]">
          Manage verified candidates you saved from semantic search and candidate profiles.
        </p>
      </section>

      {savedCandidates.length > 0 ? (
        <section className="space-y-4">
          {savedCandidates.map((candidate) => (
            <CandidateSummaryCard key={candidate.id} candidate={candidate} />
          ))}
        </section>
      ) : (
        <MarketplaceEmptyState
          icon={Search}
          title="No saved candidates yet"
          description="Shortlist candidates from semantic search or profile pages to compare and invite them here."
          actionHref="/dashboard/company/search"
          actionLabel="Discover candidates"
        />
      )}
    </main>
  );
}
