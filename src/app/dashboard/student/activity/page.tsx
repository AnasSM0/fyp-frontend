"use client";

import { useEffect, useState } from "react";
import { Activity, Bell, Eye, Search, TrendingUp } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { MarketplaceEmptyState } from "@/components/dashboard/marketplace-empty-state";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";
import {
  activityErrorMessage,
  canUseActivityDemoFallback,
  getMyActivity,
} from "@/lib/api/activity-service";
import { ActivityEvent } from "@/lib/api/types";
import { activityEventToViewModel, CandidateActivityViewModel } from "@/lib/candidate-view-adapters";

export default function StudentActivityPage() {
  const { activityEvents } = useMarketplaceStore();
  const [backendActivity, setBackendActivity] = useState<ActivityEvent[] | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "fallback" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const activityItems: CandidateActivityViewModel[] | typeof activityEvents = backendActivity
    ? backendActivity.map(activityEventToViewModel)
    : activityEvents;

  useEffect(() => {
    let cancelled = false;
    async function loadActivity() {
      setLoadState("loading");
      setMessage(null);
      try {
        const response = await getMyActivity();
        if (cancelled) return;
        setBackendActivity(response.items);
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        if (canUseActivityDemoFallback(error)) {
          setBackendActivity(null);
          setLoadState("fallback");
          setMessage("Backend unavailable. Showing local demo activity.");
          return;
        }
        setLoadState("error");
        setMessage(activityErrorMessage(error));
      }
    }
    loadActivity();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 py-8 md:px-8">
      <Breadcrumbs
        backHref="/dashboard/student"
        items={[
          { label: "Student Dashboard", href: "/dashboard/student" },
          { label: "Activity" },
        ]}
      />
      <section className="mb-6 rounded-[18px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
          <Bell className="h-3.5 w-3.5" />
          Marketplace activity center
        </div>
        <h1 className="text-[30px] font-bold text-[var(--color-text-primary)]">Recruiter Activity</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
          A single place to see company views, semantic matches, publish events, and recruiter request updates.
        </p>
      </section>

      <section className="space-y-3">
        {message && (
          <div
            role={loadState === "error" ? "alert" : undefined}
            className={`rounded-[12px] border px-4 py-3 text-[13px] font-semibold ${
              loadState === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
            }`}
          >
            {message}
          </div>
        )}
        {activityItems.map((event) => (
          <article key={event.id} className="flex gap-4 rounded-[16px] border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-accent-light)] text-[var(--color-accent)]">
              {event.type === "profile_view" ? <Eye className="h-5 w-5" /> : event.type === "semantic_match" ? <Search className="h-5 w-5" /> : event.type === "assessment_completed" ? <Activity className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold text-[var(--color-text-primary)]">{event.title}</h2>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{event.createdAt}</span>
              </div>
              <p className="mt-1 text-[14px] leading-6 text-[var(--color-text-secondary)]">{"description" in event ? event.description : event.detail}</p>
              {"actor" in event && event.actor && <div className="mt-2 text-[12px] font-bold text-[var(--color-accent)]">{event.actor}</div>}
            </div>
          </article>
        ))}

        {activityItems.length === 0 && (
          <MarketplaceEmptyState
            icon={Activity}
            title="No marketplace activity yet"
            description="Publish your verified profile and recruiter discovery events will appear here."
            actionHref="/dashboard/student/visibility"
            actionLabel="Manage visibility"
          />
        )}
      </section>
    </main>
  );
}
