"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem, cardHover } from "@/lib/motion";
import { AnimatedScoreRing } from "@/components/ui/animated-score-ring";
import {
  BadgeCheck, ArrowUpRight, Mail,
  CheckCircle2, Code2, Brain,
  TrendingUp, ChevronRight, Inbox, Eye, Search, Zap
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

// — Mock Data — (ready for backend wiring)
const skillBars = [
  { label: "React / Next.js", level: "Expert", pct: 90 },
  { label: "Python / Django", level: "Advanced", pct: 80 },
  { label: "Cloud Architecture (AWS)", level: "Intermediate", pct: 65 },
];

const assessments = [
  {
    icon: <CheckCircle2 className="w-5 h-5 text-[var(--color-verified)]" />,
    bg: "bg-[var(--color-verified)]/10",
    title: "System Design Interview",
    meta: "Completed • Scored 92/100",
    date: "Oct 24, 2023",
  },
  {
    icon: <Code2 className="w-5 h-5 text-[var(--color-accent)]" />,
    bg: "bg-[var(--color-accent-light)]",
    title: "Advanced Algorithms Challenge",
    meta: "Completed • Top 2%",
    date: "Oct 18, 2023",
  },
  {
    icon: <Brain className="w-5 h-5 text-[var(--color-text-secondary)]" />,
    bg: "bg-[var(--color-bg-secondary)]",
    title: "Behavioral Evaluation",
    meta: "Completed • Verified",
    date: "Oct 10, 2023",
  },
];

const sparklineHeights = [30, 35, 40, 38, 45, 60, 65, 80, 95];

export default function StudentDashboardPage() {
  const { invites, respondToInvite, profilePublished } = useMarketplaceStore();
  const pendingInvites = invites.filter((invite) => invite.status === "pending");
  const answeredInvites = invites.filter((invite) => invite.status !== "pending");

  return (
    <main className="max-w-[1200px] mx-auto px-8 py-10 w-full">

      {/* ── Hero / Score Card ── */}
      <motion.section
        initial="hidden" animate="visible" variants={fadeUp}
        className="bg-white border border-[var(--color-border)] rounded-[20px] p-8 shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-8"
      >
        {/* Left: Identity */}
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-verified)]/10 text-[var(--color-verified)] text-[12px] font-bold rounded-full border border-[var(--color-verified)]/30 mb-5">
            <BadgeCheck className="w-4 h-4" strokeWidth={2.5} />
            {profilePublished ? "Profile Live in Marketplace" : "Identity Verified"}
          </div>
          <h2 className="text-[36px] font-bold leading-[1.15] tracking-tight text-[var(--color-text-primary)] mb-3">
            Top 5% Candidate
          </h2>
          <p className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)] max-w-sm">
            Your comprehensive talent score reflects your outstanding performance across coding assessments, system design, and behavioral evaluations.
          </p>
        </div>

        {/* Center: XLR8 Score Ring */}
        <div className="flex flex-col items-center shrink-0">
          <AnimatedScoreRing
            score={95}
            maxScore={100}
            size={140}
            strokeWidth={9}
            label=""
            scoreClassName="text-[var(--color-verified)] text-[44px] font-bold font-mono tracking-tighter"
          />
          <span className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mt-3">XLR8 Score</span>
        </div>

        {/* Right: Percentile Stats */}
        <div className="flex-1 flex flex-col gap-6 text-center md:text-right">
          <div>
            <span className="block text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Algorithms</span>
            <span className="text-[24px] font-bold text-[var(--color-text-primary)] leading-tight">98th Pct</span>
          </div>
          <div>
            <span className="block text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">System Design</span>
            <span className="text-[24px] font-bold text-[var(--color-text-primary)] leading-tight">92nd Pct</span>
          </div>
          <div>
            <span className="block text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Global Rank</span>
            <span className="text-[24px] font-bold text-[var(--color-accent)] leading-tight">Top 5%</span>
          </div>
        </div>
      </motion.section>

      {/* ── Main Grid ── */}
      <motion.div
        initial="hidden" animate="visible" variants={staggerContainer}
        className="grid grid-cols-1 md:grid-cols-12 gap-6"
      >
        {/* ── Left Column (7) ── */}
        <div className="col-span-1 md:col-span-7 flex flex-col gap-6">

          {/* Skill Analytics */}
          <motion.section
            variants={staggerItem}
            className="bg-white border border-[var(--color-border)] rounded-[16px] p-8 shadow-sm"
          >
            <div className="flex items-center justify-between mb-7">
              <h3 className="text-[20px] font-bold text-[var(--color-text-primary)]">Skill Analytics</h3>
              <Link href="/dashboard/student/results" className="flex items-center gap-1 text-[13px] font-bold text-[var(--color-accent)] hover:underline">
                Detailed Report <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex flex-col gap-6">
              {skillBars.map((s) => (
                <SkillBar key={s.label} label={s.label} level={s.level} pct={s.pct} />
              ))}
            </div>
          </motion.section>

          {/* Ranking Trajectory */}
          <motion.section variants={staggerItem} className="bg-white border border-[var(--color-border)] rounded-[16px] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[20px] font-bold text-[var(--color-text-primary)]">Ranking Trajectory</h3>
              <TrendingUp className="w-5 h-5 text-[var(--color-text-muted)]" strokeWidth={1.5} />
            </div>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-[28px] font-bold text-[var(--color-text-primary)]">Top 8%</span>
              <span className="text-[13px] font-bold text-[var(--color-verified)] flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" /> +2.4%
              </span>
            </div>
            <p className="text-[13px] text-[var(--color-text-muted)] mb-6">Of global applicants in Software Engineering.</p>

            {/* Sparkline */}
            <div className="h-24 w-full flex items-end gap-1.5 border-b border-[var(--color-border)] pb-1 px-1">
              {sparklineHeights.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.8, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className={`w-full rounded-t-sm ${i === sparklineHeights.length - 1 ? "bg-[var(--color-accent)]" : "bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"}`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
              <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span>
            </div>
          </motion.section>

          {/* Project Highlights */}
          <motion.section variants={staggerItem} className="bg-white border border-[var(--color-border)] rounded-[16px] p-8 shadow-sm">
            <h3 className="text-[20px] font-bold text-[var(--color-text-primary)] mb-6">Project Highlights</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ProjectCard
                image="https://lh3.googleusercontent.com/aida-public/AB6AXuAJJ3xQWI6zMTCP6tAc2k_1fGHv9fyhEMbmir09NFT0BCfrF3m2YdF4k2_6C60ZTGkS84hWO6C86mD2h7sXqAeVyes534R28IKB1N7ZZXlJteXO9yXheyzGQN_U02blitMXUQ_g5MTLi_ifCqL51YTAzgNPJe_DOHWXzHHyxHw1xY1apwTyPcuf_6W1Z8KBHPr3FxHOkZkTiiLtplx0QBgxzbKBIDfSxYseXsdDKPlb9HMQAV4JU0aTWYzElczofPCsvVKp20OVlLQj"
                title="FinTech Analytics Engine"
                description="Real-time processing pipeline for market data using Kafka and React."
                tags={["React", "Kafka"]}
              />
              <ProjectCard
                image="https://lh3.googleusercontent.com/aida-public/AB6AXuBcmYPc89ZNwT-ZvBzaQN47M4jtVFYiNSghJOjDH-vGQu3SLgysdVuWzRa560uo0a5WoVpbdNqBSinRUOfmcOtU1JoR7fx4c9kI1JfUdFfvm4HPFkkIkKKlKG-TyQnR5MdckkTWQd2wBvwQJ31PTbycwF9reb7HmLxEx4aUtzzelgqws6dKqDMdWPkHT0cL8U2en3_onibxtAJo2uK6X2PHj_U41T3cP9s6tW0nFfWhc36zktUJ7Hb8Xqul4f3niJZoaBCe815HF4_2"
                title="Automated Deployment Tool"
                description="CLI tool written in Go to streamline Kubernetes deployments."
                tags={["Go", "K8s"]}
              />
            </div>
          </motion.section>

          {/* Marketplace Pulse (NEW) */}
          <motion.section variants={staggerItem} className="bg-white border border-[var(--color-border)] rounded-[16px] p-8 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <TrendingUp className="w-24 h-24" />
            </div>
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[20px] font-bold text-[var(--color-text-primary)]">Marketplace Pulse</h3>
                  <p className="text-[13px] text-[var(--color-text-muted)]">Live activity on your talent profile</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Live</span>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { type: "view", text: "A Series B Fintech in San Francisco viewed your profile", icon: <Eye />, color: "text-blue-500", bg: "bg-blue-500/10", time: "14m ago" },
                { type: "search", text: "Matched 94% on 'Senior Distributed Systems' search", icon: <Search />, color: "text-violet-500", bg: "bg-violet-500/10", time: "2h ago" },
                { type: "view", text: "Recruiter from TechFlow pinned your System Design score", icon: <TrendingUp />, color: "text-emerald-500", bg: "bg-emerald-500/10", time: "5h ago" }
              ].map((pulse, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border)] transition-all group"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", pulse.bg, pulse.color)}>
                    <div className="w-4 h-4">{pulse.icon}</div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] text-[var(--color-text-primary)] font-medium leading-relaxed">{pulse.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{pulse.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <button className="w-full mt-6 py-3 border border-dashed border-[var(--color-border)] rounded-xl text-[13px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/50 transition-all">
              View All Market Signals
            </button>
          </motion.section>

        </div>

        {/* ── Right Column (5) ── */}
        <div className="col-span-1 md:col-span-5 flex flex-col gap-6">

          {/* Interview Requests */}
          <motion.section variants={staggerItem} className="bg-white border border-[var(--color-border)] rounded-[16px] p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--color-border)]">
              <Mail className="w-5 h-5 text-[var(--color-warning)]" strokeWidth={1.5} />
              <h3 className="text-[20px] font-bold text-[var(--color-text-primary)]">Interview Requests</h3>
              <span className="ml-auto bg-[var(--color-warning)] text-white px-2 py-0.5 rounded-full font-mono text-[12px] font-bold">{pendingInvites.length}</span>
            </div>

            <div className="flex flex-col gap-6">
              {pendingInvites.length === 0 && (
                <div className="rounded-[12px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 text-center">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">No pending recruiter requests</p>
                  <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Publish your verified profile from results to increase discovery.</p>
                </div>
              )}
              {pendingInvites.map((req, i) => (
                <motion.div key={req.id} variants={staggerItem} className={`flex flex-col gap-3 ${i > 0 ? "pt-5 border-t border-[var(--color-border-subtle)]" : ""}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{req.role}</h4>
                      <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">{req.company} • {req.location}</p>
                      <p className="mt-2 text-[12px] leading-[1.5] text-[var(--color-text-muted)]">{req.message}</p>
                    </div>
                    <span className="text-[12px] text-[var(--color-text-muted)] shrink-0 ml-4">{req.createdAt}</span>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => respondToInvite(req.id, "accepted")}
                      className="flex-1 h-10 bg-[var(--color-accent)] text-white text-[13px] font-bold rounded-[8px] hover:bg-[var(--color-accent-hover)] transition-colors"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => respondToInvite(req.id, "declined")}
                      className="flex-1 h-10 bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] text-[13px] font-bold rounded-[8px] hover:bg-[var(--color-bg-subtle)] transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </motion.div>
              ))}
              {answeredInvites.slice(0, 2).map((req) => (
                <div key={req.id} className="rounded-[10px] bg-[var(--color-bg-secondary)] px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                  {req.company} request marked <span className="font-bold text-[var(--color-text-primary)]">{req.status}</span>.
                </div>
              ))}
            </div>
          </motion.section>

          {/* Recent Assessments */}
          <motion.section variants={staggerItem} className="bg-white border border-[var(--color-border)] rounded-[16px] p-7 shadow-sm flex-1">
            <h3 className="text-[20px] font-bold text-[var(--color-text-primary)] mb-6">Recent Assessments</h3>

            {/* Timeline */}
            <div className="relative pl-5">
              {/* Vertical Line */}
              <div className="absolute left-[14px] top-2 bottom-2 w-[2px] bg-[var(--color-border-subtle)]"></div>

              <div className="flex flex-col gap-7">
                {assessments.map((item, i) => (
                  <motion.div
                    key={i}
                    variants={staggerItem}
                    className="flex gap-4 relative z-10"
                  >
                    <div className={`w-10 h-10 rounded-full ${item.bg} border-2 border-white flex items-center justify-center shrink-0 shadow-sm`}>
                      {item.icon}
                    </div>
                    <div className="pt-1">
                      <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                      <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">{item.meta}</p>
                      <span className="text-[11px] text-[var(--color-text-muted)] block mt-1.5">{item.date}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Upcoming Interviews */}
          <motion.section variants={staggerItem} className="bg-white border border-[var(--color-border)] rounded-[16px] p-7 shadow-sm">
            <h3 className="text-[20px] font-bold text-[var(--color-text-primary)] mb-6">Upcoming Interviews</h3>

            <div className="border-l-2 border-[var(--color-border)] pl-6 ml-2 flex flex-col gap-8">
              {[
                { time: "Tomorrow, 10:00 AM", title: "Technical Screen: Acme Corp", sub: "Systems Design & Scaling", dot: "bg-[var(--color-accent)]" },
                { time: "Oct 24, 2:30 PM", title: "Final Round: Globex", sub: "Cultural Fit & Leadership", dot: "bg-[var(--color-border)]" },
                { time: "Oct 28, 11:00 AM", title: "Assessment Review", sub: "Algorithms Module 4", dot: "bg-[var(--color-border)]" },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className={`absolute w-2.5 h-2.5 ${item.dot} rounded-full -left-[29px] top-1.5 ring-4 ring-white`}></div>
                  <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">{item.time}</p>
                  <h4 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{item.title}</h4>
                  <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </motion.section>

        </div>
      </motion.div>
    </main>
  );
}

// — Sub-components —

function SkillBar({ label, level, pct }: { label: string; level: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2 text-[14px]">
        <span className="font-medium text-[var(--color-text-primary)]">{label}</span>
        <span className="font-mono text-[var(--color-text-secondary)]">{level}</span>
      </div>
      <div className="w-full h-2 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="h-full bg-[var(--color-accent)] rounded-full"
        />
      </div>
    </div>
  );
}

function ProjectCard({ image, title, description, tags }: { image: string; title: string; description: string; tags: string[] }) {
  return (
    <motion.div
      whileHover={cardHover.whileHover}
      className="border border-[var(--color-border)] rounded-[12px] overflow-hidden cursor-pointer group hover:border-[var(--color-accent)] transition-colors duration-200"
    >
      <div className="h-32 overflow-hidden bg-[var(--color-bg-secondary)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-4">
        <h4 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-1 truncate">{title}</h4>
        <p className="text-[12px] leading-[1.5] text-[var(--color-text-secondary)] line-clamp-2 mb-3">{description}</p>
        <div className="flex gap-2">
          {tags.map((t) => (
            <span key={t} className="px-2 py-0.5 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] font-mono text-[11px] rounded border border-[var(--color-border-subtle)]">
              {t}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
