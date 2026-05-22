import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface JourneyChecklistItem {
  label: string;
  description: string;
  complete: boolean;
}

export function JourneyChecklist({
  title,
  items,
}: {
  title: string;
  items: JourneyChecklistItem[];
}) {
  const completeCount = items.filter((item) => item.complete).length;

  return (
    <section className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-[var(--color-text-primary)]">{title}</h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
            {completeCount} of {items.length} marketplace steps complete
          </p>
        </div>
        <div className="rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[12px] font-bold text-[var(--color-accent)]">
          {Math.round((completeCount / items.length) * 100)}%
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex gap-3 rounded-[12px] border p-4",
              item.complete
                ? "border-emerald-500/20 bg-emerald-500/10"
                : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            )}
          >
            {item.complete ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
            )}
            <div>
              <div className="text-[14px] font-bold text-[var(--color-text-primary)]">{item.label}</div>
              <p className="mt-0.5 text-[12px] leading-5 text-[var(--color-text-secondary)]">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
