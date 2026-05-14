"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart2,
  Bell,
  ClipboardList,
  Eye,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  LogOut,
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
  { href: "/dashboard/student", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/student/interview/prep", icon: ClipboardList, label: "Assessment" },
  { href: "/dashboard/student/results", icon: BarChart2, label: "Results" },
  { href: "/dashboard/student/visibility", icon: Eye, label: "Profile Visibility" },
  { href: "/dashboard/student/requests", icon: Inbox, label: "Recruiter Requests" },
  { href: "/dashboard/student/activity", icon: Activity, label: "Activity" },
  { href: "/dashboard/student/projects", icon: FolderOpen, label: "Projects / Portfolio" },
  { href: "/dashboard/student/messages", icon: MessageSquare, label: "Messages" },
  { href: "/dashboard/student/settings", icon: Settings, label: "Settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard/student/interview/prep") {
    return pathname.startsWith("/dashboard/student/interview");
  }
  if (href === "/dashboard/student") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StudentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { invites } = useMarketplaceStore();
  const pendingCount = invites.filter((invite) => invite.status === "pending").length;

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const suffix = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : "";
    router.push(`/dashboard/student/activity${suffix}`);
  };

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[248px] flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] md:flex">
        <div className="flex h-full flex-col p-4">
          <Link href="/dashboard/student" className="mb-6 flex items-center gap-3 rounded-[14px] px-2 py-3 hover:bg-white">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[17px] font-bold text-[var(--color-accent)]">XLR8Hire</div>
              <div className="text-[11px] font-semibold text-[var(--color-text-muted)]">Student Portal</div>
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
                  {label === "Recruiter Requests" && pendingCount > 0 && (
                    <span className="ml-auto rounded-full bg-[var(--color-warning)] px-2 py-0.5 text-[10px] font-bold text-white">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[var(--color-border)] pt-4">
            <Link href="/dashboard/student/settings" className="mb-2 flex items-center gap-3 rounded-[10px] px-3 py-2 hover:bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQZT7yCwR5N6AMOZ6RMfaqCZzW-kxbROlVr7f12hxHei_JCDmgVVLsw_fyjtQNi2Z7LBW2CGFMXeQieQbi7O37l-HuQqekWCJ1_Q0qAw2MtjLEigyBgPyx9SAsdKGK6Zi2_9-rBIhnhQkXfUKwUkpynEM2AMnWyl-dFZUH3mVcaaHcwBneHVHPEY1PhjkvrxyRfmSfkPpkuZeldaVqzKK-OdpgrRJbC4gE8ACoxjBIi9tLeoKwK19FPOMOtsdL41KwdvVr5rt9vMdD"
                alt="Student Profile"
                className="h-8 w-8 rounded-full border border-[var(--color-border)] object-cover"
              />
              <div>
                <div className="text-[13px] font-bold text-[var(--color-text-primary)]">Alex Chen</div>
                <div className="text-[11px] text-[var(--color-text-muted)]">Profile settings</div>
              </div>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-semibold text-[var(--color-text-secondary)] hover:bg-white hover:text-red-500"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Link>
          </div>
        </div>
      </aside>

      <div className="min-h-screen md:ml-[248px]">
        <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 md:left-[248px] md:px-8">
          <div className="flex items-center gap-3">
            <MobileDashboardNav nav={NAV} title="XLR8Hire" subtitle="Student Portal" homeHref="/dashboard/student" />
            <form onSubmit={handleSearch} className="hidden h-10 w-72 items-center gap-2 rounded-[10px] border border-transparent bg-[var(--color-bg-subtle)] px-4 focus-within:border-[var(--color-accent-border)] md:flex">
              <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full border-none bg-transparent text-[14px] outline-none placeholder:text-[var(--color-text-muted)]"
                placeholder="Search activity or requests"
              />
            </form>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard/student/activity"
              aria-label="View activity"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-accent)]"
            >
              <Bell className="h-5 w-5" />
              {pendingCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[var(--color-warning)]" />}
            </Link>
            <Link
              href="/dashboard/student/settings"
              aria-label="Open settings"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-accent)]"
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
