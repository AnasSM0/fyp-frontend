"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem, cardHover } from "@/lib/motion";
import { 
  Terminal, GraduationCap, Brain, 
  Quote, TrendingUp, BadgeCheck, 
  Code, AppWindow, CalendarPlus, 
  Bookmark, MapPin, Briefcase, 
  Banknote, CalendarDays, Monitor,
  Target, Zap, Database, Cloud, FileDown, ArchiveX, ArrowUpRight, X
} from "lucide-react";
import { AnimatedScoreRing } from "@/components/ui/animated-score-ring";
import { cn } from "@/lib/utils";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

const tabs = ["Overview", "Interview Replay", "AI Insights", "Experience", "Portfolio", "Feedback"];

export default function CandidateProfilePage() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSentId, setInviteSentId] = useState<string | null>(null);
  const { savedCandidateIds, toggleSavedCandidate, sendInvite } = useMarketplaceStore();
  const isSaved = savedCandidateIds.includes("candidate-sarah-chen");

  const handleSendInvite = () => {
    const id = sendInvite({
      candidateName: "Sarah Chen",
      company: "Acme Corp",
      role: "Senior Frontend Engineer",
      location: "Remote",
      salaryRange: "$150k - $180k",
      interviewWindow: "Tomorrow, 10:00 AM",
      message: "Your verified React and system design signals match our platform team. We would like to schedule a technical screen.",
    });
    setInviteSentId(id);
    setInviteOpen(false);
  };

  return (
    <main className="max-w-[1200px] mx-auto pt-[32px] pb-[96px] px-[24px] w-full">
      
      {/* Enhanced Header Section */}
      <motion.header 
        initial="hidden" animate="visible" variants={fadeUp}
        className="flex flex-col md:flex-row justify-between items-start bg-white border border-[var(--color-border)] rounded-[16px] p-[32px] shadow-[var(--shadow-card)] mb-[24px] gap-[32px]"
      >
        <div className="flex flex-col md:flex-row items-start gap-[24px] flex-1">
          <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-4 border-[var(--color-border)] shrink-0 bg-[var(--color-bg-secondary)] shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Sarah Chen" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmqYPzk7vEls2gTHjXiMDUQdVIwcRID4tkocVNYs_0C-felUy4Qf2ALcGia3_gPInWQIJfhwyaaxeIrxKAzcFniJJ3rOw_Jndchqo776KHV_4JBanMnEXfT4G-TIvmktVK10KrStUQx0bQZj4CcZvB3oq-Xdn2Ev9SKpSqeozir_TQKVn7prxkpOe_MKeWPk1tspD_mwKwTk4KR8jzzF2LnkY96_G7vAUcrvn5Ws1qJ8PGb_3BO0M7wm8CM2T0kdRnfjSY6b8Mcrcv"/>
          </div>
          <div className="flex flex-col flex-1">
            <h1 className="text-[36px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--color-text-primary)] mb-[8px]">Sarah Chen</h1>
            
            <div className="flex flex-wrap items-center gap-[12px] text-[var(--color-text-secondary)] text-[14px] font-medium leading-[1.6] mb-[16px]">
              <span className="flex items-center gap-[4px]"><MapPin className="w-[16px] h-[16px]" /> San Francisco, CA</span>
              <span className="w-1 h-1 rounded-full bg-[var(--color-border)]"></span>
              <span className="flex items-center gap-[4px]"><Briefcase className="w-[16px] h-[16px]" /> 8+ Years Experience</span>
              <span className="w-1 h-1 rounded-full bg-[var(--color-border)]"></span>
              <span className="flex items-center gap-[4px] text-[var(--color-accent)]"><GraduationCap className="w-[16px] h-[16px]" /> MIT Alumni</span>
            </div>

            <p className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)] max-w-[600px]">
              Senior Full-Stack Engineer specializing in scalable React applications and Node.js microservices. Proven track record of improving system performance by 40% and leading cross-functional teams in high-growth startup environments.
            </p>
          </div>
        </div>

        {/* Score Ring */}
        <div className="flex flex-col items-center gap-[16px] bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] p-[24px] rounded-[16px] shrink-0 min-w-[200px]">
          <AnimatedScoreRing 
            score={92} 
            maxScore={100} 
            size={100} 
            strokeWidth={8} 
            label=""
            scoreClassName="text-[var(--color-verified)] text-[32px] font-bold"
          />
          <div className="text-center">
            <div className="text-[12px] font-bold text-[var(--color-text-secondary)] tracking-wider uppercase">XLR8 Score</div>
            <div className="text-[12px] leading-[1.5] text-[var(--color-text-muted)] mt-[2px]">Top 3% Semantic Fit</div>
          </div>
        </div>
      </motion.header>

      {/* Horizontal Navigation */}
      <motion.nav 
        initial="hidden" animate="visible" variants={fadeUp}
        className="flex items-center gap-[8px] border-b border-[var(--color-border)] mb-[32px] overflow-x-auto no-scrollbar pb-[1px]"
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-[16px] py-[12px] text-[14px] font-medium transition-colors ${
              activeTab === tab ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[var(--color-accent)] rounded-t-full z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </motion.nav>

      {/* Content Split */}
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col xl:flex-row gap-[32px] items-start">
        
        {/* Left Column: Main Content */}
        <div className="flex-1 w-full flex flex-col gap-[32px]">
          
          {/* AI Interview Insights */}
          {activeTab === "Overview" && (
            <motion.section variants={staggerItem} className="bg-white border border-[var(--color-border)] rounded-[16px] p-[32px] shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-[12px] mb-[32px]">
                <Brain className="text-[var(--color-accent)] w-[28px] h-[28px]" strokeWidth={2} />
                <h2 className="text-[24px] font-bold leading-[1.2] text-[var(--color-text-primary)]">
                  AI Verified Insights
                </h2>
              </div>

              {/* AI Summary Comment */}
              <div className="bg-[var(--color-accent-light)] border border-[var(--color-accent-border)] rounded-[12px] p-[24px] mb-[32px] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent"></div>
                <p className="text-[15px] leading-[1.6] text-[var(--color-text-primary)] relative z-10 font-medium">
                  Sarah exhibits exceptional system design capabilities and strong technical depth in React ecosystem. Natural leadership qualities evident in past roles, though communication style is highly direct. Ideal for fast-paced, high-autonomy environments.
                </p>
              </div>

              {/* Metric Bars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[32px] gap-y-[24px]">
                <MetricBar label="Technical Depth" percentage={95} color="var(--color-verified)" />
                <MetricBar label="Problem Solving" percentage={88} color="var(--color-verified)" />
                <MetricBar label="System Design" percentage={92} color="var(--color-verified)" />
                <MetricBar label="Communication" percentage={78} color="var(--color-warning)" />
              </div>
            </motion.section>
          )}

          {activeTab === "Interview Replay" && (
            <motion.section variants={staggerItem} className="bg-white border border-[var(--color-border)] rounded-[16px] p-[32px] shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Assessment Replay</h2>
                    <p className="text-sm text-[var(--color-text-muted)]">Verified Session #VER-4092</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-xs font-bold rounded-full border border-emerald-500/20">
                    100% Verified
                  </span>
                </div>
              </div>

              {/* Replay Timeline */}
              <div className="space-y-6">
                {[
                  { time: "00:00", event: "Assessment Started", type: "system", icon: <Zap /> },
                  { time: "02:15", event: "Problem Definition: TwoSum", type: "ai", icon: <Brain /> },
                  { time: "05:40", event: "Candidate proposed O(n) Hash Map approach", type: "candidate", icon: <Quote />, insight: "Strong clarity in explaining algorithmic trade-offs." },
                  { time: "08:12", event: "Coding implementation began", type: "code", icon: <Code />, snippet: "def twoSum(nums, target):\n    num_map = {}\n    for i, num in enumerate(nums):..." },
                  { time: "14:20", event: "Candidate handled edge case: Empty Input", type: "insight", icon: <BadgeCheck />, insight: "Proactive identification of edge cases without prompting." },
                  { time: "18:45", event: "Final solution submitted", type: "system", icon: <Target /> }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="flex flex-col items-center">
                      <div className="text-[11px] font-mono font-bold text-[var(--color-text-muted)] mb-2">{item.time}</div>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 z-10",
                        item.type === "ai" ? "bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.4)]" :
                        item.type === "candidate" ? "bg-indigo-500" :
                        item.type === "code" ? "bg-slate-800" :
                        item.type === "insight" ? "bg-emerald-500" : "bg-slate-400"
                      )}>
                        <div className="w-4 h-4">{item.icon}</div>
                      </div>
                      {i < 5 && <div className="w-0.5 flex-1 bg-[var(--color-border-subtle)] my-2" />}
                    </div>
                    <div className="flex-1 pt-6 pb-6">
                      <div className="text-[15px] font-bold text-[var(--color-text-primary)] mb-2 group-hover:text-[var(--color-accent)] transition-colors">
                        {item.event}
                      </div>
                      {item.insight && (
                        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-secondary)] leading-relaxed italic">
                          "{item.insight}"
                        </div>
                      )}
                      {item.snippet && (
                        <div className="mt-3 p-4 bg-slate-900 rounded-xl font-mono text-[13px] text-indigo-300 border border-slate-800 relative group/code">
                          <pre className="overflow-x-auto">{item.snippet}</pre>
                          <button className="absolute top-3 right-3 opacity-0 group-hover/code:opacity-100 transition-opacity bg-slate-800 p-2 rounded-lg text-white">
                            <Code className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sentiment Summary */}
              <div className="mt-10 pt-8 border-t border-[var(--color-border-subtle)]">
                <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-6">Candidate Behavioral Pulse</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Confidence", val: "High", color: "text-emerald-500" },
                    { label: "Pacing", val: "Consistent", color: "text-emerald-500" },
                    { label: "Articulation", val: "Clear", color: "text-emerald-500" }
                  ].map(stat => (
                    <div key={stat.label} className="bg-[var(--color-bg-secondary)] p-4 rounded-2xl border border-[var(--color-border-subtle)] text-center">
                      <div className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold mb-1">{stat.label}</div>
                      <div className={cn("text-lg font-bold", stat.color)}>{stat.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {/* Technical Expertise Grid */}
          <motion.section variants={staggerItem}>
            <h2 className="text-[24px] font-bold leading-[1.2] text-[var(--color-text-primary)] mb-[24px]">Technical Expertise</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <ExpertiseCard 
                title="Frontend" 
                icon={<Monitor className="w-[16px] h-[16px] text-[var(--color-accent)]" />}
                skills={["React", "TypeScript", "Next.js", "Tailwind"]} 
              />
              <ExpertiseCard 
                title="Backend" 
                icon={<Terminal className="w-[16px] h-[16px] text-[var(--color-text-primary)]" />}
                skills={["Node.js", "Python", "GraphQL"]} 
              />
              <ExpertiseCard 
                title="Database" 
                icon={<Database className="w-[16px] h-[16px] text-[var(--color-text-primary)]" />}
                skills={["PostgreSQL", "MongoDB", "Redis"]} 
              />
              <ExpertiseCard 
                title="Cloud & DevOps" 
                icon={<Cloud className="w-[16px] h-[16px] text-[var(--color-text-primary)]" />}
                skills={["AWS", "Docker", "CI/CD"]} 
              />
            </div>
          </motion.section>

          {/* Skill Graph & Achievements Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[32px]">
            {/* Skill Graph */}
            <motion.section variants={staggerItem} className="bg-white border border-[var(--color-border)] rounded-[16px] p-[32px] shadow-[var(--shadow-card)] flex flex-col items-center justify-center min-h-[300px]">
              <h3 className="text-[20px] font-semibold leading-[1.3] text-[var(--color-text-primary)] mb-[48px] w-full text-left">Competency Matrix</h3>
              <div className="relative w-[180px] h-[180px]">
                {/* Stylized CSS Radar Chart */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
                  <polygon fill="none" stroke="var(--color-border)" strokeWidth="0.5" points="50,5 95,25 95,75 50,95 5,75 5,25"></polygon>
                  <polygon fill="none" stroke="var(--color-border)" strokeWidth="0.5" points="50,25 75,40 75,60 50,75 25,60 25,40"></polygon>
                  <line stroke="var(--color-border)" strokeWidth="0.5" x1="50" y1="50" x2="50" y2="5"></line>
                  <line stroke="var(--color-border)" strokeWidth="0.5" x1="50" y1="50" x2="95" y2="25"></line>
                  <line stroke="var(--color-border)" strokeWidth="0.5" x1="50" y1="50" x2="95" y2="75"></line>
                  <line stroke="var(--color-border)" strokeWidth="0.5" x1="50" y1="50" x2="50" y2="95"></line>
                  <line stroke="var(--color-border)" strokeWidth="0.5" x1="50" y1="50" x2="5" y2="75"></line>
                  <line stroke="var(--color-border)" strokeWidth="0.5" x1="50" y1="50" x2="5" y2="25"></line>
                  
                  <motion.polygon 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.8 }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                    style={{ originX: "50px", originY: "50px" }}
                    fill="var(--color-accent-light)" stroke="var(--color-accent)" strokeWidth="2" points="50,15 85,30 90,70 50,85 20,65 15,35"
                  ></motion.polygon>
                  
                  <circle cx="50" cy="15" fill="var(--color-accent)" r="2"></circle>
                  <circle cx="85" cy="30" fill="var(--color-accent)" r="2"></circle>
                  <circle cx="90" cy="70" fill="var(--color-accent)" r="2"></circle>
                  <circle cx="50" cy="85" fill="var(--color-accent)" r="2"></circle>
                  <circle cx="20" cy="65" fill="var(--color-accent)" r="2"></circle>
                  <circle cx="15" cy="35" fill="var(--color-accent)" r="2"></circle>
                </svg>
                {/* Labels */}
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Frontend</span>
                <span className="absolute top-[20%] -right-10 text-[11px] font-medium text-[var(--color-text-secondary)]">Backend</span>
                <span className="absolute bottom-[20%] -right-10 text-[11px] font-medium text-[var(--color-text-secondary)]">DevOps</span>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Database</span>
                <span className="absolute bottom-[20%] -left-10 text-[11px] font-medium text-[var(--color-text-secondary)]">Testing</span>
                <span className="absolute top-[20%] -left-12 text-[11px] font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Architecture</span>
              </div>
            </motion.section>

            {/* Achievements */}
            <motion.section variants={staggerItem} className="bg-white border border-[var(--color-border)] rounded-[16px] p-[32px] shadow-[var(--shadow-card)] flex flex-col">
              <h3 className="text-[20px] font-semibold leading-[1.3] text-[var(--color-text-primary)] mb-[24px]">Verified Milestones</h3>
              <div className="flex flex-col gap-[12px] mt-auto">
                <Milestone icon={<Brain />} title="#1 Frontend Assessment" sub="Out of 4,200 candidates (Q3)" color="var(--color-accent)" bg="var(--color-accent-light)" />
                <Milestone icon={<TrendingUp />} title="Top 3% Growth Velocity" sub="Skill acquisition rate" color="var(--color-verified)" bg="var(--color-bg-primary)" isOutlined />
                <Milestone icon={<BadgeCheck />} title="MIT Identity Verified" sub="Education credentials checked" color="var(--color-text-primary)" bg="var(--color-bg-secondary)" />
              </div>
            </motion.section>
          </div>

          {/* Experience Timeline */}
          <motion.section variants={staggerItem} className="mt-[16px]">
            <h2 className="text-[24px] font-bold leading-[1.2] text-[var(--color-text-primary)] mb-[32px]">Experience</h2>
            <div className="relative border-l border-[var(--color-border-subtle)] ml-[12px] space-y-[40px] pb-[16px]">
              
              <motion.div variants={staggerItem} className="relative pl-[32px]">
                <div className="absolute -left-[5px] top-[6px] w-[10px] h-[10px] rounded-full bg-[var(--color-accent)] ring-[6px] ring-[var(--color-bg-primary)]"></div>
                <div className="flex flex-col md:flex-row md:justify-between md:items-baseline mb-[8px]">
                  <h3 className="text-[18px] font-bold text-[var(--color-text-primary)]">Staff Engineer <span className="text-[var(--color-text-secondary)] font-normal">at TechFlow</span></h3>
                  <span className="font-mono text-[13px] text-[var(--color-text-muted)] mt-[4px] md:mt-0">2021 - Present</span>
                </div>
                <p className="text-[14px] leading-[1.6] text-[var(--color-text-secondary)] max-w-3xl">
                  Led technical direction for core SaaS product. Mentored a team of 12 engineers. Introduced micro-frontend architecture reducing deployment times by 60%.
                </p>
              </motion.div>

              <motion.div variants={staggerItem} className="relative pl-[32px]">
                <div className="absolute -left-[5px] top-[6px] w-[10px] h-[10px] rounded-full bg-[var(--color-border)] ring-[6px] ring-[var(--color-bg-primary)]"></div>
                <div className="flex flex-col md:flex-row md:justify-between md:items-baseline mb-[8px]">
                  <h3 className="text-[18px] font-bold text-[var(--color-text-primary)]">Senior Developer <span className="text-[var(--color-text-secondary)] font-normal">at DataSync</span></h3>
                  <span className="font-mono text-[13px] text-[var(--color-text-muted)] mt-[4px] md:mt-0">2018 - 2021</span>
                </div>
                <p className="text-[14px] leading-[1.6] text-[var(--color-text-secondary)] max-w-3xl">
                  Architected data ingestion pipelines processing 50TB+ daily. Rebuilt legacy PHP monolithic app to Node.js microservices.
                </p>
              </motion.div>

            </div>
          </motion.section>

          {/* Proof of Work: Verified Code Lab */}
          <motion.section variants={staggerItem} className="mt-[16px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <BadgeCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Verified Code Lab</h2>
                  <p className="text-sm text-[var(--color-text-muted)]">Live signals captured during AI Assessment</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Authenticity Score</div>
                <div className="text-lg font-mono font-bold text-emerald-500">99.8%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: "Distributed Locking Mechanism", lang: "Rust", description: "Implementation of a Redlock-style distributed lock using Redis and custom retry logic.", lines: 124 },
                { title: "High-Concurrency Middleware", lang: "Go", description: "Custom HTTP middleware for rate limiting and request tracing in microservices.", lines: 86 }
              ].map((lab, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -4 }}
                  className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden group cursor-pointer"
                >
                  <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <h4 className="text-[14px] font-bold text-white/90">{lab.title}</h4>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-white/30">{lab.lang} • {lab.lines} lines</span>
                  </div>
                  <div className="p-5 bg-black/40">
                    <p className="text-[13px] leading-[1.6] text-white/50 mb-4">{lab.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded uppercase tracking-tighter border border-emerald-500/20">Verified by AI</span>
                      <span className="px-2 py-0.5 bg-violet-500/10 text-violet-500 text-[10px] font-bold rounded uppercase tracking-tighter border border-violet-500/20">Clean Code</span>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[11px] font-bold text-violet-400">View Source Analysis</span>
                    <ArrowUpRight className="w-4 h-4 text-violet-400" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Project Showcase */}
          <motion.section variants={staggerItem} className="mt-[16px]">
            <div className="flex items-center justify-between mb-[24px]">
              <h2 className="text-[24px] font-bold leading-[1.2] text-[var(--color-text-primary)]">Featured Projects</h2>
              <button className="text-[13px] font-bold text-[var(--color-accent)] hover:underline">View All</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
              
              <motion.div whileHover={cardHover.whileHover} className="bg-white border border-[var(--color-border)] rounded-[16px] p-[24px] shadow-[var(--shadow-card)] transition-transform duration-200 cursor-pointer flex flex-col h-full">
                <div className="flex items-center justify-between mb-[16px]">
                  <div className="w-[40px] h-[40px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-primary)] flex items-center justify-center text-[var(--color-accent)]">
                    <Code className="w-[20px] h-[20px]" strokeWidth={1.5} />
                  </div>
                  <span className="px-[8px] py-[4px] bg-[var(--color-verified)]/10 text-[var(--color-verified)] text-[11px] font-mono font-bold rounded-[4px] border border-[var(--color-verified)]/20">Shipped</span>
                </div>
                <h4 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-[8px]">Global Payment Gateway</h4>
                <p className="text-[14px] leading-[1.6] text-[var(--color-text-secondary)] mb-[24px] flex-grow">Architected and deployed a multi-currency payment processing system handling $2M+ daily volume with 99.99% uptime.</p>
                <div className="flex gap-[8px] flex-wrap mt-auto">
                  <span className="px-[8px] py-[4px] border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-[4px] font-mono text-[11px]">Node.js</span>
                  <span className="px-[8px] py-[4px] border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-[4px] font-mono text-[11px]">PostgreSQL</span>
                  <span className="px-[8px] py-[4px] border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-[4px] font-mono text-[11px]">AWS</span>
                </div>
              </motion.div>

              <motion.div whileHover={cardHover.whileHover} className="bg-white border border-[var(--color-border)] rounded-[16px] p-[24px] shadow-[var(--shadow-card)] transition-transform duration-200 cursor-pointer flex flex-col h-full">
                <div className="flex items-center justify-between mb-[16px]">
                  <div className="w-[40px] h-[40px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-primary)] flex items-center justify-center text-[var(--color-accent)]">
                    <AppWindow className="w-[20px] h-[20px]" strokeWidth={1.5} />
                  </div>
                  <span className="px-[8px] py-[4px] bg-[var(--color-verified)]/10 text-[var(--color-verified)] text-[11px] font-mono font-bold rounded-[4px] border border-[var(--color-verified)]/20">Shipped</span>
                </div>
                <h4 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-[8px]">Real-time Analytics Dashboard</h4>
                <p className="text-[14px] leading-[1.6] text-[var(--color-text-secondary)] mb-[24px] flex-grow">Built a high-performance React dashboard consuming WebSocket streams to visualize user behavior metrics for 100k+ concurrent users.</p>
                <div className="flex gap-[8px] flex-wrap mt-auto">
                  <span className="px-[8px] py-[4px] border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-[4px] font-mono text-[11px]">React</span>
                  <span className="px-[8px] py-[4px] border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-[4px] font-mono text-[11px]">TypeScript</span>
                  <span className="px-[8px] py-[4px] border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-[4px] font-mono text-[11px]">WebSockets</span>
                </div>
              </motion.div>

            </div>
          </motion.section>

        </div>

        {/* Right Column: Sticky Sidebar */}
        <motion.aside variants={staggerItem} className="w-full xl:w-[320px] shrink-0 sticky top-[84px] flex flex-col gap-[24px]">
          
          {/* Metadata Card */}
          <div className="bg-white border border-[var(--color-border)] rounded-[16px] p-[24px] shadow-[var(--shadow-card)]">
            <h3 className="text-[12px] font-bold text-[var(--color-text-secondary)] mb-[20px] uppercase tracking-wider">Profile Details</h3>
            
            <div className="flex flex-col gap-[20px]">
              <div className="flex items-start gap-[12px]">
                <CalendarDays className="w-[18px] h-[18px] text-[var(--color-text-muted)] shrink-0" />
                <div>
                  <div className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-[2px]">Availability</div>
                  <div className="text-[13px] text-[var(--color-verified)] font-medium">Actively Interviewing</div>
                </div>
              </div>

              <div className="flex items-start gap-[12px]">
                <Banknote className="w-[18px] h-[18px] text-[var(--color-text-muted)] shrink-0" />
                <div>
                  <div className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-[2px]">Expected Salary</div>
                  <div className="text-[13px] text-[var(--color-text-secondary)] font-medium">$180k - $220k</div>
                </div>
              </div>

              <div className="flex items-start gap-[12px]">
                <Briefcase className="w-[18px] h-[18px] text-[var(--color-text-muted)] shrink-0" />
                <div>
                  <div className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-[2px]">Work Style</div>
                  <div className="text-[13px] text-[var(--color-text-secondary)] font-medium">Hybrid / Remote</div>
                </div>
              </div>

              <div className="flex items-start gap-[12px]">
                <GraduationCap className="w-[18px] h-[18px] text-[var(--color-text-muted)] shrink-0" />
                <div>
                  <div className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-[2px]">Education</div>
                  <div className="text-[13px] text-[var(--color-text-secondary)] font-medium leading-[1.5]">BS Computer Science<br/>UC Berkeley</div>
                </div>
              </div>
            </div>

            <hr className="border-[var(--color-border-subtle)] my-[24px]" />
            
            <button
              onClick={() => setInviteOpen(true)}
              className="w-full bg-[var(--color-accent)] text-white text-[13px] font-bold py-[12px] rounded-[8px] flex items-center justify-center gap-[8px] hover:bg-[var(--color-accent-hover)] transition-colors duration-150 mb-[12px]"
            >
              <CalendarPlus className="w-[18px] h-[18px]" strokeWidth={2} />
              {inviteSentId ? "Invite Sent" : "Invite to Interview"}
            </button>
            <button
              onClick={() => toggleSavedCandidate("candidate-sarah-chen")}
              className="w-full bg-white text-[var(--color-text-primary)] border border-[var(--color-border)] text-[13px] font-bold py-[12px] rounded-[8px] flex items-center justify-center gap-[8px] hover:bg-[var(--color-bg-subtle)] transition-colors duration-150"
            >
              <Bookmark className="w-[18px] h-[18px]" strokeWidth={2} />
              {isSaved ? "Saved Profile" : "Save Profile"}
            </button>
            {inviteSentId && (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-700">
                Request {inviteSentId} is pending candidate response.
              </p>
            )}
          </div>

          {/* Timeline / Activity */}
          <div className="bg-white border border-[var(--color-border)] rounded-[16px] p-[24px] shadow-[var(--shadow-card)]">
            <h3 className="text-[12px] font-bold text-[var(--color-text-secondary)] mb-[24px] uppercase tracking-wider">Recent Activity</h3>
            <div className="flex flex-col gap-[20px]">
              
              <div className="flex gap-[16px]">
                <div className="w-[32px] h-[32px] rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center shrink-0 border border-[var(--color-border)]">
                  <Code className="w-[14px] h-[14px] text-[var(--color-text-secondary)]" />
                </div>
                <div>
                  <div className="text-[14px] leading-[1.4] text-[var(--color-text-primary)]">Pushed 12 commits to <span className="font-semibold">react-core-components</span></div>
                  <div className="text-[12px] text-[var(--color-text-muted)] mt-[4px]">2 days ago</div>
                </div>
              </div>
              
              <div className="flex gap-[16px]">
                <div className="w-[32px] h-[32px] rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center shrink-0 border border-[var(--color-border)]">
                  <Brain className="w-[14px] h-[14px] text-[var(--color-text-secondary)]" />
                </div>
                <div>
                  <div className="text-[14px] leading-[1.4] text-[var(--color-text-primary)]">Completed assessment: <span className="font-semibold">Advanced System Architecture</span></div>
                  <div className="text-[12px] text-[var(--color-text-muted)] mt-[4px]">1 week ago</div>
                </div>
              </div>
              
              <div className="flex gap-[16px]">
                <div className="w-[32px] h-[32px] rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center shrink-0 border border-[var(--color-border)]">
                  <Monitor className="w-[14px] h-[14px] text-[var(--color-text-secondary)]" />
                </div>
                <div>
                  <div className="text-[14px] leading-[1.4] text-[var(--color-text-primary)]">Answered 5 technical questions in <span className="font-semibold">Community Forum</span></div>
                  <div className="text-[12px] text-[var(--color-text-muted)] mt-[4px]">2 weeks ago</div>
                </div>
              </div>

            </div>
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-col gap-[8px] pt-[8px]">
            <button className="flex items-center gap-[12px] text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] px-[16px] py-[12px] rounded-[8px] transition-colors">
              <FileDown className="w-[18px] h-[18px]" /> Download CV
            </button>
            <button className="flex items-center gap-[12px] text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-warning)] hover:bg-[var(--color-warning)]/10 px-[16px] py-[12px] rounded-[8px] transition-colors">
              <ArchiveX className="w-[18px] h-[18px]" /> Archive Candidate
            </button>
          </div>

        </motion.aside>

      </motion.div>
      {inviteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[16px] border border-[var(--color-border)] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-bold text-[var(--color-text-primary)]">Invite Sarah Chen</h2>
                <p className="mt-1 text-[14px] text-[var(--color-text-secondary)]">
                  Send a recruiter request that appears in the candidate dashboard.
                </p>
              </div>
              <button onClick={() => setInviteOpen(false)} aria-label="Close invite composer" className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 rounded-[12px] bg-[var(--color-bg-secondary)] p-4 text-[13px] text-[var(--color-text-secondary)]">
              <div><strong className="text-[var(--color-text-primary)]">Role:</strong> Senior Frontend Engineer</div>
              <div><strong className="text-[var(--color-text-primary)]">Compensation:</strong> $150k - $180k</div>
              <div><strong className="text-[var(--color-text-primary)]">Message:</strong> Your verified React and system design signals match our platform team.</div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setInviteOpen(false)} className="rounded-[8px] border border-[var(--color-border)] px-4 py-2 text-[13px] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]">
                Cancel
              </button>
              <button onClick={handleSendInvite} className="rounded-[8px] bg-[var(--color-accent)] px-4 py-2 text-[13px] font-bold text-white hover:bg-[var(--color-accent-hover)]">
                Send Interview Request
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Reusable component for Metric Bars
function MetricBar({ label, percentage, color = "var(--color-accent)" }: { label: string, percentage: number, color?: string }) {
  return (
    <div>
      <div className="flex justify-between mb-[8px] text-[13px] font-medium leading-[1.4]">
        <span className="text-[var(--color-text-primary)]">{label}</span>
        <span className="font-mono" style={{ color }}>{percentage}%</span>
      </div>
      <div className="h-[8px] w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          whileInView={{ width: `${percentage}%` }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// Reusable component for Expertise Cards
function ExpertiseCard({ title, icon, skills }: { title: string, icon: React.ReactNode, skills: string[] }) {
  return (
    <motion.div whileHover={cardHover.whileHover} className="bg-white border border-[var(--color-border)] rounded-[12px] p-[20px] shadow-sm transition-transform duration-200">
      <div className="flex items-center gap-[8px] mb-[16px]">
        {icon}
        <h3 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-[8px]">
        {skills.map(skill => (
          <span key={skill} className="px-[12px] py-[4px] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded-full font-mono text-[12px] border border-[var(--color-border-subtle)]">
            {skill}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// Reusable component for Milestones
function Milestone({ icon, title, sub, color, bg, isOutlined }: any) {
  return (
    <div className="flex items-center gap-[16px] p-[12px] rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
      <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0 ${isOutlined ? 'border' : ''}`} style={{ backgroundColor: bg, color: color, borderColor: isOutlined ? color : 'transparent' }}>
        <div style={{ width: 20, height: 20 }}>{icon}</div>
      </div>
      <div>
        <div className="text-[13px] font-medium leading-[1.4] text-[var(--color-text-primary)]">{title}</div>
        <div className="text-[13px] leading-[1.5] text-[var(--color-text-secondary)] mt-[2px]">{sub}</div>
      </div>
    </div>
  );
}
