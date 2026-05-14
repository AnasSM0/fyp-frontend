import Link from "next/link";
import { LucideIcon } from "lucide-react";

export function MarketplaceEmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--color-border)] bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-[17px] font-bold text-[var(--color-text-primary)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center justify-center rounded-[8px] bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--color-accent-hover)]"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
