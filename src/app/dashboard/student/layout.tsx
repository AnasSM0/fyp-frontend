"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ClipboardList, BarChart2,
  FolderOpen, Briefcase, MessageSquare,
  LogOut, Bell, Settings, Search, Zap,
  PanelLeftClose, PanelLeftOpen
} from "lucide-react";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV = [
  { href: "/dashboard/student", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/student/interview/prep", icon: ClipboardList, label: "Assessments" },
  { href: "/dashboard/company/leaderboard", icon: BarChart2,     label: "Rankings" },
  { href: "/dashboard/student/results", icon: BarChart2,     label: "Results" },
  { href: "#", icon: FolderOpen,    label: "Projects" },
  { href: "#", icon: MessageSquare, label: "Messages" },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const W = open ? 240 : 64;
  const pathname = usePathname();

  return (
    <>
      {/* ── Sidebar ── */}
      <motion.aside
        animate={{ width: W }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="h-screen fixed left-0 top-0 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] z-50 flex flex-col overflow-hidden"
        style={{ width: W }}
      >
        {/* Logo row */}
        <div className="flex items-center justify-between px-4 pt-6 pb-4 shrink-0">
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <div className="w-8 h-8 bg-[var(--color-accent)] rounded-lg flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[16px] font-bold text-[var(--color-accent)] whitespace-nowrap">XLR8Hire</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] whitespace-nowrap">Student Portal</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* When collapsed, show just the icon */}
          {!open && (
            <div className="w-8 h-8 bg-[var(--color-accent)] rounded-lg flex items-center justify-center mx-auto">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`mx-3 mb-3 flex items-center ${open ? "gap-2 px-3" : "justify-center px-0"} py-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-accent)] transition-all`}
          title={open ? "Collapse sidebar" : "Expand sidebar"}
        >
          {open
            ? <><PanelLeftClose className="w-4 h-4 shrink-0" /><span className="text-[13px] font-medium whitespace-nowrap">Collapse</span></>
            : <PanelLeftOpen className="w-4 h-4 shrink-0" />
          }
        </button>

        {/* Nav */}
        <nav className="flex flex-col gap-y-1 px-3 flex-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={label}
                href={href}
                title={!open ? label : undefined}
                className={`flex items-center ${open ? "gap-3 px-3" : "justify-center px-0"} py-2.5 rounded-lg transition-all duration-150 group
                  ${active
                    ? "bg-[var(--color-accent-light)] text-[var(--color-accent)] font-bold"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:translate-x-0.5"
                  }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? "" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]"} transition-colors`} strokeWidth={active ? 2 : 1.5} />
                <AnimatePresence>
                  {open && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-[15px] whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>


        {/* Bottom: profile + sign out */}
        <div className="border-t border-[var(--color-border)] pt-3 pb-4 px-3 flex flex-col gap-1 shrink-0">
          <div className={`flex items-center ${open ? "gap-3 px-3" : "justify-center"} py-2`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQZT7yCwR5N6AMOZ6RMfaqCZzW-kxbROlVr7f12hxHei_JCDmgVVLsw_fyjtQNi2Z7LBW2CGFMXeQieQbi7O37l-HuQqekWCJ1_Q0qAw2MtjLEigyBgPyx9SAsdKGK6Zi2_9-rBIhnhQkXfUKwUkpynEM2AMnWyl-dFZUH3mVcaaHcwBneHVHPEY1PhjkvrxyRfmSfkPpkuZeldaVqzKK-OdpgrRJbC4gE8ACoxjBIi9tLeoKwK19FPOMOtsdL41KwdvVr5rt9vMdD"
              alt="Student Profile"
              className="w-8 h-8 rounded-full border border-[var(--color-border)] object-cover shrink-0"
            />
            <AnimatePresence>
              {open && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                  <div className="text-[13px] font-semibold text-[var(--color-text-primary)] whitespace-nowrap">Alex Chen</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] whitespace-nowrap">alex@university.edu</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Link
            href="#"
            title={!open ? "Sign Out" : undefined}
            className={`flex items-center ${open ? "gap-3 px-3" : "justify-center"} py-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-red-500 rounded-lg transition-all`}
          >
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <AnimatePresence>
              {open && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="text-[14px] whitespace-nowrap">
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </motion.aside>

      {/* ── Topbar + Content Wrapper ── */}
      <motion.div
        animate={{ marginLeft: W }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col min-h-screen"
      >
        {/* Topbar */}
        <motion.header
          animate={{ left: W }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="h-16 fixed top-0 right-0 z-40 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] flex items-center justify-between px-8"
          style={{ left: W }}
        >
          <div className="flex items-center gap-2 w-64 h-10 bg-[var(--color-bg-subtle)] rounded-lg px-4 border border-transparent focus-within:border-[var(--color-accent-border)] focus-within:bg-[var(--color-bg-primary)] transition-all">
            <Search className="w-4 h-4 text-[var(--color-text-muted)]" strokeWidth={1.5} />
            <input
              className="bg-transparent border-none outline-none text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] w-full"
              placeholder="Search..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors relative">
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-[var(--color-warning)] rounded-full border-2 border-white"></span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors">
              <Settings className="w-5 h-5" strokeWidth={1.5} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQZT7yCwR5N6AMOZ6RMfaqCZzW-kxbROlVr7f12hxHei_JCDmgVVLsw_fyjtQNi2Z7LBW2CGFMXeQieQbi7O37l-HuQqekWCJ1_Q0qAw2MtjLEigyBgPyx9SAsdKGK6Zi2_9-rBIhnhQkXfUKwUkpynEM2AMnWyl-dFZUH3mVcaaHcwBneHVHPEY1PhjkvrxyRfmSfkPpkuZeldaVqzKK-OdpgrRJbC4gE8ACoxjBIi9tLeoKwK19FPOMOtsdL41KwdvVr5rt9vMdD"
              alt="Student"
              className="w-9 h-9 rounded-full object-cover border-2 border-[var(--color-border)] ml-1"
            />
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="mt-16 flex-1 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </>
  );
}
