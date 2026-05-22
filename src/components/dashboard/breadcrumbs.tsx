import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({
  items,
  backHref,
  backLabel = "Back",
}: {
  items: BreadcrumbItem[];
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <span key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link href={item.href} className="font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)]">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "font-bold text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
