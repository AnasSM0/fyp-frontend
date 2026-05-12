import Link from "next/link";
import { ReactNode } from "react";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* SideNavBar */}
      <aside className="w-[240px] h-screen fixed left-0 top-0 bg-bg-secondary dark:bg-inverse-surface border-r border-border-default z-50">
        <div className="flex flex-col p-6 gap-y-2 h-full">
          <div className="mb-section flex items-center gap-base">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-text-label text-text-label font-bold">X</div>
            <div>
              <h1 className="font-text-h2 text-text-h2 font-bold text-primary dark:text-primary-fixed">XLR8Hire</h1>
              <p className="font-text-label text-text-label text-text-muted">Company Portal</p>
            </div>
          </div>
          <nav className="flex flex-col gap-y-micro flex-1">
            <Link className="flex items-center gap-base px-base py-small hover:bg-bg-subtle dark:hover:bg-surface-variant text-text-secondary dark:text-on-surface-variant font-bold rounded-lg scale-95 active:scale-90 transition-all duration-150 ease-in-out hover:translate-x-1" href="/dashboard/company">
              <span className="material-symbols-outlined text-medium">search</span>
              <span className="font-text-body text-text-body font-medium">Discover</span>
            </Link>
            <Link className="flex items-center gap-base px-base py-small hover:bg-bg-subtle dark:hover:bg-surface-variant text-text-secondary dark:text-on-surface-variant rounded-lg scale-95 active:scale-90 transition-all duration-150 ease-in-out hover:translate-x-1" href="/dashboard/company/leaderboard">
              <span className="material-symbols-outlined text-medium">leaderboard</span>
              <span className="font-text-body text-text-body font-medium">Leaderboard</span>
            </Link>
            <Link className="flex items-center gap-base px-base py-small text-text-secondary dark:text-on-surface-variant hover:bg-bg-subtle dark:hover:bg-surface-variant rounded-lg scale-95 active:scale-90 transition-all duration-150 ease-in-out hover:translate-x-1" href="#">
              <span className="material-symbols-outlined text-medium">bookmark</span>
              <span className="font-text-body text-text-body font-medium">Saved</span>
            </Link>
            <Link className="flex items-center gap-base px-base py-small text-text-secondary dark:text-on-surface-variant hover:bg-bg-subtle dark:hover:bg-surface-variant rounded-lg scale-95 active:scale-90 transition-all duration-150 ease-in-out hover:translate-x-1" href="#">
              <span className="material-symbols-outlined text-medium">work_outline</span>
              <span className="font-text-body text-text-body font-medium">Offers</span>
            </Link>
            <Link className="flex items-center gap-base px-base py-small text-text-secondary dark:text-on-surface-variant hover:bg-bg-subtle dark:hover:bg-surface-variant rounded-lg scale-95 active:scale-90 transition-all duration-150 ease-in-out hover:translate-x-1" href="#">
              <span className="material-symbols-outlined text-medium">bar_chart</span>
              <span className="font-text-body text-text-body font-medium">Analytics</span>
            </Link>
          </nav>
          <div className="mt-auto pt-section border-t border-border-default">
            <div className="flex items-center gap-base px-base">
              <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden border border-border-default">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Company Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAV9K6EB65klrr57QbNn7WGd65TfuCzUFINJprpthuS2asyRFKTkz5UcrCdlY7BjtqQLsEXbKL1h70doupG5pZpAdSfSN1FiB-Umm9L22_uUE0IyP5SW0LpfoCU9wXP5G39RrXswi29EHfkqXc-b0yyaPZ0jSiTqZ23ngP_doMoKDjb2xlxbGV5TV_jiXe12q0czFJs0YLPmjIMQyMtSHKJTYBFyDabsncELsaZsEjraeF-xDPCmpEtTLfUFBGslYsa7PtvUMkzf-aS"/>
              </div>
              <div className="flex flex-col">
                <span className="font-text-label text-text-label text-text-primary">Acme Corp</span>
                <span className="font-text-label text-[11px] text-text-muted">Settings</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* TopNavBar & Main Content Wrapper */}
      <div className="flex-1 ml-[240px] flex flex-col h-screen relative">
        {/* TopNavBar */}
        <header className="h-16 fixed top-0 right-0 left-[240px] z-40 bg-surface-container-lowest dark:bg-on-surface border-b border-border-default dark:border-outline-variant flex items-center justify-between px-8">
          <div className="flex items-center gap-2">
            <h1 className="font-text-h3 text-text-h3 font-bold text-text-primary">XLR8Hire Platform</h1>
          </div>
          <div className="flex items-center gap-comfortable">
            <button className="relative w-10 h-10 flex items-center justify-center hover:bg-bg-subtle rounded-full transition-colors">
              <span className="material-symbols-outlined text-text-secondary">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-status-error rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Main Content Canvas */}
        <div className="mt-16 flex-1 overflow-y-auto w-full">
          {children}
        </div>
      </div>
    </>
  );
}
