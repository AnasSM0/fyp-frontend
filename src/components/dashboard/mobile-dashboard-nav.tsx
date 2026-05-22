"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon, Menu, X, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

export function MobileDashboardNav({
  nav,
  title,
  subtitle,
  homeHref,
}: {
  nav: DashboardNavItem[];
  title: string;
  subtitle: string;
  homeHref: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-primary)]"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/40">
          <div className="h-full w-[86vw] max-w-[320px] bg-[var(--color-bg-secondary)] p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <Link href={homeHref} onClick={() => setOpen(false)} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-white">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[17px] font-bold text-[var(--color-accent)]">{title}</div>
                  <div className="text-[11px] font-semibold text-[var(--color-text-muted)]">{subtitle}</div>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="rounded-[10px] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {nav.map(({ href, icon: Icon, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-[10px] px-3 py-3 text-[15px] font-semibold",
                      active
                        ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
