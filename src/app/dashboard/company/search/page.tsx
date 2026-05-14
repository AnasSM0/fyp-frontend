"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, Filter, Search, Sparkles, X, Zap } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { CandidateSummaryCard } from "@/components/dashboard/candidate-summary-card";
import { MarketplaceEmptyState } from "@/components/dashboard/marketplace-empty-state";
import { MARKETPLACE_CANDIDATES } from "@/lib/mock-marketplace";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";
import { cn } from "@/lib/utils";

const FILTERS = ["React", "TypeScript", "System Design", "Go", "Python", "Node.js", "GraphQL"];
const SUGGESTIONS = [
  "Senior React engineer with system design experience",
  "Backend engineer with Python and API design",
  "Cloud engineer with Kubernetes and Go",
];

export default function TalentSearchPage() {
  const { lastSearchQuery, setLastSearchQuery } = useMarketplaceStore();
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (lastSearchQuery) {
      setQuery(lastSearchQuery);
      setHasSearched(true);
    }
  }, [lastSearchQuery]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tokens = q
      .split(/[^a-z0-9+#.]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length > 2);
    return MARKETPLACE_CANDIDATES.filter((candidate) => {
      const haystack = [
        candidate.name,
        candidate.role,
        candidate.reasoning,
        candidate.location,
        candidate.education,
        ...candidate.skills,
        ...candidate.evidence,
      ]
        .join(" ")
        .toLowerCase();
      const qMatch =
        !q ||
        tokens.length === 0 ||
        tokens.some((token) => haystack.includes(token));
      const fMatch =
        activeFilters.length === 0 ||
        activeFilters.some((filter) => candidate.skills.includes(filter));
      return qMatch && fMatch;
    });
  }, [activeFilters, query]);

  const handleSearch = (nextQuery = query) => {
    const normalized = nextQuery.trim();
    if (!normalized && activeFilters.length === 0) return;
    setQuery(normalized);
    setLastSearchQuery(normalized);
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setHasSearched(true);
    }, 700);
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter]
    );
  };

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-8 md:px-8">
      <Breadcrumbs
        backHref="/dashboard/company"
        items={[
          { label: "Company Dashboard", href: "/dashboard/company" },
          { label: "Discover" },
        ]}
      />

      <section className="mb-6 rounded-[20px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
          <Sparkles className="h-3.5 w-3.5" />
          Semantic AI Search
        </div>
        <h1 className="text-[34px] font-bold text-[var(--color-text-primary)]">Find Verified Talent</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
          Search by role, skill, project evidence, or describe what you need. Candidates are ranked by semantic match and verified score.
        </p>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch()}
              placeholder="e.g. Senior React engineer with product instincts"
              className="h-14 w-full rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] pl-12 pr-4 text-[14px] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <button
            type="button"
            onClick={() => handleSearch()}
            className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[var(--color-accent)] px-6 py-3 text-[14px] font-bold text-white hover:bg-[var(--color-accent-hover)]"
          >
            {isSearching ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {isSearching ? "Analyzing" : "Search"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="mr-1 flex items-center gap-1.5 text-[12px] font-bold text-[var(--color-text-muted)]">
            <Filter className="h-3.5 w-3.5" />
            Skills
          </div>
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => toggleFilter(filter)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] font-bold",
                activeFilters.includes(filter)
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                  : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
              )}
            >
              {filter}
              {activeFilters.includes(filter) && <X className="ml-1 inline h-3 w-3" />}
            </button>
          ))}
        </div>
      </section>

      {!hasSearched && activeFilters.length === 0 ? (
        <section className="rounded-[18px] border border-dashed border-[var(--color-border)] bg-white p-10 text-center">
          <Brain className="mx-auto h-10 w-10 text-[var(--color-accent)]" />
          <h2 className="mt-4 text-[22px] font-bold text-[var(--color-text-primary)]">Start with a semantic search</h2>
          <p className="mx-auto mt-2 max-w-lg text-[14px] leading-6 text-[var(--color-text-secondary)]">
            Describe the talent outcome, not only keywords. XLR8Hire explains why each verified candidate matches.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSearch(suggestion)}
                className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-[13px] font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      ) : filtered.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Semantic Match Results</div>
              <h2 className="mt-1 text-[22px] font-bold text-[var(--color-text-primary)]">{filtered.length} verified candidates found</h2>
            </div>
            <div className="hidden rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[12px] font-bold text-[var(--color-accent)] sm:block">
              Ranked by AI fit score
            </div>
          </div>
          <div className="space-y-4">
            {filtered.map((candidate) => (
              <CandidateSummaryCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        </section>
      ) : (
        <MarketplaceEmptyState
          icon={Search}
          title="No candidates match this query"
          description="Try a broader role description or remove one of the active skill filters."
          actionLabel="Clear filters"
        />
      )}
    </main>
  );
}
