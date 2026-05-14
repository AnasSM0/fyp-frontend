"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Bell,
  Bookmark,
  Briefcase,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DashboardNavItem, MobileDashboardNav } from "@/components/dashboard/mobile-dashboard-nav";
import { cn } from "@/lib/utils";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

const NAV: DashboardNavItem[] = [
  { href: "/dashboard/company", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/company/search", icon: Search, label: "Discover" },
  { href: "/dashboard/company/saved", icon: Bookmark, label: "Shortlist" },
  { href: "/dashboard/company/offers", icon: Briefcase, label: "Requests / Invites" },
  { href: "/dashboard/company/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/dashboard/company/messages", icon: MessageSquare, label: "Messages" },
  { href: "/dashboard/company/settings", icon: Settings, label: "Settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard/company") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function CompanyLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { invites } = useMarketplaceStore();
  const pendingInvites = invites.filter((invite) => invite.status === "pending").length;

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[248px] border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] md:block">
        <div className="flex h-full flex-col gap-y-2 p-5">
          <Link href="/dashboard/company" className="mb-8 flex items-center gap-3 rounded-[14px] px-1 py-2 hover:bg-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-[24px] font-bold leading-none text-[var(--color-accent)]">XLR8Hire</h1>
              <p className="mt-1 text-[12px] font-medium text-[var(--color-text-muted)]">Company Portal</p>
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map(({ href, icon: Icon, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-semibold transition-all",
                    active
                      ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                      : "text-[var(--color-text-secondary)] hover:bg-white hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]")} />
                  <span className="leading-tight">{label}</span>
                  {label === "Requests / Invites" && pendingInvites > 0 && (
                    <span className="ml-auto rounded-full bg-[var(--color-warning)] px-2 py-0.5 text-[10px] font-bold text-white">
                      {pendingInvites}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/dashboard/company/settings"
            className="mt-auto flex items-center gap-3 border-t border-[var(--color-border)] px-3 pt-4"
          >
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[var(--color-border)] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Company Profile"
                className="h-full w-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAV9K6EB65klrr57QbNn7WGd65TfuCzUFINJprpthuS2asyRFKTkz5UcrCdlY7BjtqQLsEXbKL1h70doupG5pZpAdSfSN1FiB-Umm9L22_uUE0IyP5SW0LpfoCU9wXP5G39RrXswi29EHfkqXc-b0yyaPZ0jSiTqZ23ngP_doMoKDjb2xlxbGV5TV_jiXe12q0czFJs0YLPmjIMQyMtSHKJTYBFyDabsncELsaZsEjraeF-xDPCmpEtTLfUFBGslYsa7PtvUMkzf-aS"
              />
            </div>
            <div>
              <span className="block text-[13px] font-bold text-[var(--color-text-primary)]">Acme Corp</span>
              <span className="text-[11px] text-[var(--color-text-muted)]">Settings</span>
            </div>
          </Link>
        </div>
      </aside>

      <div className="min-h-screen md:ml-[248px]">
        <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 md:left-[248px] md:px-8">
          <div className="flex items-center gap-3">
            <MobileDashboardNav nav={NAV} title="XLR8Hire" subtitle="Company Portal" homeHref="/dashboard/company" />
            <h2 className="text-[18px] font-bold text-[var(--color-text-primary)] md:text-[22px]">Talent Intelligence Platform</h2>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard/company/offers"
              aria-label="View recruiter requests"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-accent)]"
            >
              <Bell className="h-5 w-5" />
              {pendingInvites > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[var(--color-warning)]" />}
            </Link>
            <Link
              href="/dashboard/company/settings"
              aria-label="Open settings"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-accent)] sm:flex"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </header>

        <div className="pt-16">{children}</div>
      </div>
    </>
  );
}
