"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { 
  Search, Trophy, Bookmark, 
  Briefcase, BarChart2, Bell, Zap
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const NAV = [
    { href: "/dashboard/company/search", icon: Search, label: "Discover" },
    { href: "/dashboard/company/leaderboard", icon: Trophy, label: "Leaderboard" },
    { href: "/dashboard/company/saved", icon: Bookmark, label: "Saved" },
    { href: "/dashboard/company/offers", icon: Briefcase, label: "Offers" },
    { href: "/dashboard/company/analytics", icon: BarChart2, label: "Analytics" },
  ];
  return (
    <>
      {/* SideNavBar */}
      <aside className="w-[240px] h-screen fixed left-0 top-0 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] z-50">
        <div className="flex flex-col p-[24px] gap-y-[8px] h-full">
          
          {/* Logo Section */}
          <div className="mb-[48px] flex items-center gap-[12px]">
            <div className="w-[32px] h-[32px] rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-[13px] font-bold">X</div>
            <div>
              <h1 className="text-[28px] font-bold leading-[1.2] tracking-tight text-[var(--color-accent)]">XLR8Hire</h1>
              <p className="text-[13px] font-medium text-[var(--color-text-muted)]">Company Portal</p>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex flex-col gap-y-[4px] flex-1">
            {NAV.map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <Link 
                  key={label}
                  className={`group flex items-center gap-[12px] px-[12px] py-[8px] rounded-[8px] transition-all duration-150 ease-in-out
                    ${active 
                      ? "bg-[var(--color-accent-light)] text-[var(--color-accent)] font-bold" 
                      : "hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium"
                    }`} 
                  href={href}
                >
                  <Icon className={`w-[20px] h-[20px] ${active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]"} transition-colors`} strokeWidth={active ? 2 : 1.5} />
                  <span className="text-[15px]">{label}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* User Profile Section */}
          <div className="mt-auto pt-[48px] border-t border-[var(--color-border)]">
            <div className="flex items-center gap-[12px] px-[12px] cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-[32px] h-[32px] rounded-full bg-[var(--color-bg-secondary)] overflow-hidden border border-[var(--color-border)] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Company Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAV9K6EB65klrr57QbNn7WGd65TfuCzUFINJprpthuS2asyRFKTkz5UcrCdlY7BjtqQLsEXbKL1h70doupG5pZpAdSfSN1FiB-Umm9L22_uUE0IyP5SW0LpfoCU9wXP5G39RrXswi29EHfkqXc-b0yyaPZ0jSiTqZ23ngP_doMoKDjb2xlxbGV5TV_jiXe12q0czFJs0YLPmjIMQyMtSHKJTYBFyDabsncELsaZsEjraeF-xDPCmpEtTLfUFBGslYsa7PtvUMkzf-aS"/>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-[var(--color-text-primary)]">Acme Corp</span>
                <span className="text-[11px] text-[var(--color-text-muted)]">Settings</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* TopNavBar & Main Content Wrapper */}
      <div className="flex-1 ml-[240px] flex flex-col h-screen relative">
        
        {/* TopNavBar */}
        <header className="h-[64px] fixed top-0 right-0 left-[240px] z-40 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] flex items-center justify-between px-[32px]">
          <div className="flex items-center gap-2">
            <h2 className="text-[22px] font-semibold text-[var(--color-text-primary)]">XLR8Hire Platform</h2>
          </div>
          <div className="flex items-center gap-[24px]">
            <ThemeToggle />
            <button className="relative w-[40px] h-[40px] flex items-center justify-center hover:bg-[var(--color-bg-subtle)] rounded-full transition-colors text-[var(--color-text-secondary)]">
              <Bell className="w-[20px] h-[20px]" strokeWidth={1.5} />
              <span className="absolute top-[8px] right-[10px] w-[8px] h-[8px] bg-[var(--color-warning)] rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Main Content Canvas */}
        <div className="mt-[64px] flex-1 overflow-y-auto w-full">
          {children}
        </div>
      </div>
    </>
  );
}
