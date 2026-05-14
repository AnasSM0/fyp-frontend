import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined: "bg-rose-50 text-rose-700 border-rose-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  unpublished: "bg-slate-50 text-slate-600 border-slate-200",
  saved: "bg-violet-50 text-violet-700 border-violet-200",
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  interviewing: "bg-blue-50 text-blue-700 border-blue-200",
  paused: "bg-slate-50 text-slate-600 border-slate-200",
};

export function MarketplaceStatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize",
        STATUS_CLASSES[status] ?? "bg-slate-50 text-slate-600 border-slate-200",
        className
      )}
    >
      {label ?? status.replace(/-/g, " ")}
    </span>
  );
}
