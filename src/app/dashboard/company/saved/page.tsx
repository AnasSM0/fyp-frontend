"use client";

import Link from "next/link";
import { Bookmark, Search } from "lucide-react";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

export default function SavedCandidatesPage() {
  const { savedCandidateIds } = useMarketplaceStore();

  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-6 p-8">
      <div>
        <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">Saved Candidates</h1>
        <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">Your recruiter shortlist from search and candidate profiles.</p>
      </div>
      <section className="rounded-[16px] border border-[var(--color-border)] bg-white p-8">
        <div className="flex items-center gap-3">
          <Bookmark className="h-5 w-5 text-[var(--color-accent)]" />
          <span className="font-bold">{savedCandidateIds.length} saved profiles</span>
        </div>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          Shortlist candidates from semantic search or profile pages to compare them here.
        </p>
        <Link href="/dashboard/company/search" className="mt-6 inline-flex items-center gap-2 rounded-[8px] bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-white">
          <Search className="h-4 w-4" /> Discover candidates
        </Link>
      </section>
    </main>
  );
}
