"use client";

import { useEffect, useState } from "react";
import { Brain, Filter, Search, Sparkles, X, Zap } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { CandidateSummaryCard } from "@/components/dashboard/candidate-summary-card";
import { MarketplaceEmptyState } from "@/components/dashboard/marketplace-empty-state";
import {
  recruiterMarketplaceErrorMessage,
  searchRecruiterCandidates,
} from "@/lib/api/recruiter-marketplace-service";
import { RecruiterCandidateSearchItem, RecruiterCandidateSearchResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const FILTERS = ["FastAPI", "RAG", "React", "TypeScript", "PostgreSQL", "Docker", "Python"];
const SUGGESTIONS = [
  "AI ML FastAPI RAG",
  "Backend engineer with FastAPI and PostgreSQL",
  "Full stack developer with React and APIs",
];

export default function TalentSearchPage() {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<"match" | "score" | "recent">("match");
  const [minScore, setMinScore] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<RecruiterCandidateSearchItem[]>([]);
  const [responseMeta, setResponseMeta] = useState<RecruiterCandidateSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q");
    if (initialQuery) {
      setQuery(initialQuery);
      void handleSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (nextQuery = query) => {
    const normalized = nextQuery.trim();
    if (!normalized && activeFilters.length === 0 && !minScore) return;
    setQuery(normalized);
    setIsSearching(true);
    setHasSearched(true);
    setError(null);
    try {
      const response = await searchRecruiterCandidates({
        q: normalized || undefined,
        skills: activeFilters,
        minScore: minScore ? Number(minScore) : undefined,
        sort,
        pageSize: 10,
      });
      setResults(response.items);
      setResponseMeta(response);
    } catch (requestError) {
      setResults([]);
      setResponseMeta(null);
      setError(recruiterMarketplaceErrorMessage(requestError));
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters((current) =>
      current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]
    );
  };

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-8 md:px-8">
      <Breadcrumbs backHref="/dashboard/company" items={[{ label: "Company Dashboard", href: "/dashboard/company" }, { label: "Discover" }]} />

      <section className="mb-6 rounded-[20px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
          <Sparkles className="h-3.5 w-3.5" />
          Backend candidate search
        </div>
        <h1 className="text-[34px] font-bold text-[var(--color-text-primary)]">Find Verified Talent</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
          Search published candidates with completed assessment reports. Results are real database rows, ranked by keyword fallback when vectors are unavailable.
        </p>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void handleSearch()}
              placeholder="e.g. AI ML FastAPI RAG"
              className="h-14 w-full rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] pl-12 pr-4 text-[14px] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-14 rounded-[14px] border border-[var(--color-border)] bg-white px-4 text-[14px] font-bold text-[var(--color-text-secondary)]">
            <option value="match">Sort: Match</option>
            <option value="score">Sort: Score</option>
            <option value="recent">Sort: Recent</option>
          </select>
          <input
            value={minScore}
            onChange={(event) => setMinScore(event.target.value)}
            inputMode="numeric"
            placeholder="Min score"
            className="h-14 w-full rounded-[14px] border border-[var(--color-border)] bg-white px-4 text-[14px] outline-none focus:border-[var(--color-accent)] md:w-28"
          />
          <button type="button" onClick={() => void handleSearch()} className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[var(--color-accent)] px-6 py-3 text-[14px] font-bold text-white hover:bg-[var(--color-accent-hover)]">
            {isSearching ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Zap className="h-4 w-4" />}
            {isSearching ? "Searching" : "Search"}
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
          <h2 className="mt-4 text-[22px] font-bold text-[var(--color-text-primary)]">Start with a marketplace search</h2>
          <p className="mx-auto mt-2 max-w-lg text-[14px] leading-6 text-[var(--color-text-secondary)]">
            Search by role, skills, or project evidence. No static candidate cards are shown here.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} onClick={() => void handleSearch(suggestion)} className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-[13px] font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      ) : error ? (
        <MarketplaceEmptyState icon={Search} title="Recruiter search unavailable" description={error} />
      ) : results.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                {responseMeta?.matching_mode === "keyword_fallback" ? "Keyword fallback results" : "Vector match results"}
              </div>
              <h2 className="mt-1 text-[22px] font-bold text-[var(--color-text-primary)]">{responseMeta?.total ?? results.length} verified candidates found</h2>
            </div>
            <div className="hidden rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[12px] font-bold text-[var(--color-accent)] sm:block">
              Backend-ranked
            </div>
          </div>
          <div className="space-y-4">
            {results.map((candidate) => (
              <CandidateSummaryCard key={candidate.candidate_id} candidate={candidate} />
            ))}
          </div>
        </section>
      ) : (
        <MarketplaceEmptyState icon={Search} title="No matching verified candidates found." description="Try a broader role description or remove one of the active skill filters." />
      )}
    </main>
  );
}
