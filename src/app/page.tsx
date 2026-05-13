"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { 
  Zap, ArrowRight, Play, ShieldCheck, Briefcase, Brain, Check, ClipboardCheck, ArrowUpRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedScoreRing } from "@/components/ui/animated-score-ring";
import { cardHover, staggerContainer, staggerItem } from "@/lib/motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// --- NAVBAR ---
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 w-full h-[64px] z-[200] transition-all duration-250 ease-in-out px-[20px] md:px-[48px]",
        scrolled
          ? "bg-[rgba(255,255,255,0.92)] backdrop-blur-[12px] border-b border-[var(--color-border)]"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="max-w-[1280px] mx-auto h-full flex justify-between items-center">
        {/* LEFT */}
        <Link href="/" className="flex items-center gap-[8px]">
          <Zap className="w-[18px] h-[18px] text-[var(--color-accent)] fill-[var(--color-accent)]" strokeWidth={1.5} />
          <span className="text-[17px] font-[700] text-[var(--color-text-primary)]">XLR8Hire</span>
        </Link>

        {/* CENTER */}
        <div className="hidden md:flex items-center gap-[36px]">
          {["Features", "Rankings", "For Companies", "Pricing"].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-[14px] font-[500] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-150 relative group"
            >
              {link}
              <span className="absolute left-0 bottom-[-4px] w-full h-[2px] bg-[var(--color-accent)] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-200 ease-out" />
            </a>
          ))}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-[12px]">
          <ThemeToggle />
          <Link href="/login">
            <button className="hidden sm:block text-[14px] font-[500] text-[var(--color-text-secondary)] bg-transparent border-none hover:text-[var(--color-text-primary)] transition-colors">
              Log In
            </button>
          </Link>
          <Link href="/signup">
            <button className="h-[38px] px-[18px] bg-[var(--color-accent)] text-white text-[14px] font-[500] rounded-[10px] flex items-center gap-[6px] hover:bg-[var(--color-accent-hover)] transition-colors">
              Get Started Free
              <ArrowRight className="w-[14px] h-[14px]" strokeWidth={1.5} />
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// --- HERO SECTION ---
function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 300]); // parallax effect

  return (
    <section className="relative min-h-screen bg-[var(--color-bg-dark)] overflow-hidden pt-[160px] pb-[120px] flex justify-center">
      {/* BACKGROUND LAYER */}
      <motion.div 
        style={{ y, backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        className="absolute inset-0 w-full h-[200%] animate-[particle-drift_60s_linear_infinite]"
      />
      <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
        <div className="w-[900px] h-[600px] bg-[rgba(79,70,229,0.08)] rounded-full blur-[100px] -translate-x-[10%]" />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 w-full max-w-[860px] text-center px-[20px] mx-auto flex flex-col items-center">
        {/* OVERLINE */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-[6px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] rounded-full px-[14px] py-[6px]"
        >
          <Zap className="w-[12px] h-[12px] text-[#818CF8]" strokeWidth={1.5} />
          <span className="text-[12px] font-[500] text-[rgba(255,255,255,0.7)]">AI-Powered Reverse Hiring</span>
          <a href="#" className="text-[12px] font-[600] text-[#818CF8] flex items-center gap-[2px] ml-1 hover:underline">
            New <ArrowUpRight className="w-[10px] h-[10px]" strokeWidth={1.5} />
          </a>
        </motion.div>

        {/* HEADLINE */}
        <div className="mt-[24px]">
          <h1 className="text-[40px] sm:text-[60px] md:text-[80px] font-[800] leading-[1.0] tracking-[-0.04em] text-white flex flex-col items-center justify-center">
            <span className="flex overflow-hidden">
              {["Stop", "applying."].map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="mr-[12px] md:mr-[20px]"
                >
                  {word}
                </motion.span>
              ))}
            </span>
            <span className="flex overflow-hidden mt-2">
              {["Get", "discovered"].map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + (i * 0.05), duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className={cn("mr-[12px] md:mr-[20px] flex items-end", i === 1 && "mr-0")}
                >
                  {word}
                  {i === 1 && <span className="w-[10px] h-[10px] bg-[var(--color-accent)] rounded-full inline-block ml-[2px] mb-[12px] md:mb-[18px]" />}
                </motion.span>
              ))}
            </span>
          </h1>
        </div>

        {/* SUBTEXT */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-[24px] text-[16px] sm:text-[19px] font-[400] text-[rgba(255,255,255,0.6)] leading-[1.65] max-w-[560px]"
        >
          AI-powered skill verification and reverse hiring for the next generation of talent.
        </motion.p>

        {/* CTA ROW */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-[40px] flex flex-col sm:flex-row items-center gap-[12px]"
        >
          <Link href="/signup" className="w-full sm:w-auto">
            <motion.button whileHover={cardHover.whileHover} whileTap={cardHover.whileTap} className="relative overflow-hidden group bg-[var(--color-accent)] text-white h-[52px] px-[28px] rounded-[12px] text-[16px] font-[600] flex items-center gap-[8px] hover:bg-[var(--color-accent-hover)] transition-colors shadow-[0_0_24px_rgba(79,70,229,0.35)] w-full justify-center">
              Get Ranked Free
              <ArrowRight className="w-[16px] h-[16px]" strokeWidth={1.5} />
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer-sweep_1.5s_infinite] bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.2)] to-transparent" />
            </motion.button>
          </Link>
          
          <Link href="#how-it-works" className="w-full sm:w-auto">
            <motion.button whileHover={cardHover.whileHover} whileTap={cardHover.whileTap} className="bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.85)] border border-[rgba(255,255,255,0.12)] h-[52px] px-[24px] rounded-[12px] text-[16px] font-[500] flex items-center gap-[8px] hover:bg-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.2)] transition-colors w-full justify-center">
              See How It Works
              <Play className="w-[14px] h-[14px] fill-[rgba(255,255,255,0.85)]" strokeWidth={1.5} />
            </motion.button>
          </Link>
        </motion.div>


        {/* SOCIAL PROOF */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="mt-[48px] flex flex-wrap justify-center items-center gap-[8px]"
        >
          <div className="flex -space-x-[8px]">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-[28px] h-[28px] rounded-full border-[2px] border-[var(--color-bg-dark)] bg-gray-600 flex items-center justify-center text-[8px] text-white uppercase font-bold">
                {String.fromCharCode(64+i)}{String.fromCharCode(64+i+5)}
              </div>
            ))}
          </div>
          <span className="text-[13px] font-[500] text-[rgba(255,255,255,0.5)] ml-[4px]">Join 2,400+ verified students</span>
          <div className="w-[1px] h-[16px] bg-[rgba(255,255,255,0.15)] mx-[4px] hidden sm:block" />
          <div className="flex items-center gap-[2px]">
            {[1,2,3,4,5].map(i => <StarIcon key={i} />)}
          </div>
          <span className="text-[13px] text-[rgba(255,255,255,0.4)] ml-[4px]">4.9/5 from students</span>
        </motion.div>
      </div>

      {/* UI PREVIEW - Hidden on smaller screens for simplicity, visible on lg */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.7, ease: "easeOut" }}
        className="hidden lg:block absolute right-[calc(50vw-640px-40px)] bottom-[-60px] z-20 pointer-events-none"
      >
        <div className="relative">
          {/* Panel B */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 2.5 }}
            className="absolute -top-[40px] -left-[80px] w-[200px] bg-[rgba(18,18,28,0.9)] border border-[rgba(255,255,255,0.1)] rounded-[14px] p-[14px] px-[16px] shadow-[0_16px_32px_rgba(0,0,0,0.3)] z-30 pointer-events-auto"
          >
            <div className="flex items-center gap-[6px] mb-[8px]">
              <Briefcase className="w-[16px] h-[16px] text-[var(--color-accent)]" strokeWidth={1.5} />
              <span className="text-[12px] font-[600] text-[rgba(255,255,255,0.85)] leading-[1.2]">New Interview Request</span>
            </div>
            <div className="flex items-center gap-[6px] mb-[4px]">
              <div className="w-[16px] h-[16px] bg-[#635BFF] rounded-[4px]" />
              <span className="text-[12px] font-[500] text-[rgba(255,255,255,0.6)]">Stripe</span>
            </div>
            <div className="text-[11px] text-[rgba(255,255,255,0.4)] mb-[8px]">Frontend Engineer Intern</div>
            <div className="text-[11px] font-[600] text-[var(--color-accent)]">View Offer →</div>
          </motion.div>

          {/* Panel A */}
          <motion.div
            animate={{ y: [-10, 0, -10] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            className="w-[360px] bg-[rgba(18,18,28,0.85)] backdrop-blur-[20px] border border-[rgba(255,255,255,0.1)] rounded-[20px] p-[24px] shadow-[0_32px_64px_rgba(0,0,0,0.4)] origin-bottom-right -rotate-[1.5deg] pointer-events-auto"
          >
            <div className="flex justify-between items-center mb-[20px]">
              <span className="text-[11px] font-[600] text-[rgba(255,255,255,0.4)] uppercase tracking-wide">Verified Talent Score</span>
              <ShieldCheck className="w-[14px] h-[14px] text-[var(--color-verified)]" strokeWidth={1.5} />
            </div>

            <AnimatedScoreRing score={847} size={120} strokeWidth={6} label="Score" className="mx-auto" />

            <div className="mt-[20px] text-center">
              <div className="text-[13px] font-[700] text-[var(--color-verified)]">Top 8% Globally</div>
              <div className="text-[12px] text-[rgba(255,255,255,0.4)] mt-[4px]">#47 of 2,412 students</div>
            </div>

            <div className="w-full h-[1px] bg-[rgba(255,255,255,0.08)] my-[16px]" />

            <div className="flex flex-col gap-[8px]">
              {[
                { r: "#1", n: "Sarah C.", s: "912" },
                { r: "#2", n: "Marcus J.", s: "887", active: true },
                { r: "#3", n: "Priya P.", s: "871" }
              ].map((row, i) => (
                <div key={i} className={cn("flex items-center h-[36px] gap-[10px] px-[8px] rounded-[6px]", row.active && "bg-[rgba(255,255,255,0.04)]")}>
                  <span className="font-mono text-[12px] font-[600] text-[rgba(255,255,255,0.3)] w-[20px]">{row.r}</span>
                  <div className="w-[24px] h-[24px] rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white uppercase">{row.n.substring(0,2)}</div>
                  <span className="text-[13px] font-[500] text-[rgba(255,255,255,0.8)] flex-1">{row.n}</span>
                  <span className="text-[11px] font-[600] font-mono bg-[rgba(5,150,105,0.15)] text-[var(--color-verified)] border border-[rgba(5,150,105,0.25)] rounded-full px-[7px] py-[2px]">{row.s}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  );
}

// --- SOCIAL PROOF STRIP ---
function LogoStrip() {
  return (
    <section className="bg-white py-[48px] border-t border-b border-[var(--color-border)]">
      <div className="max-w-[1280px] mx-auto px-[20px] md:px-[48px] text-center">
        <p className="text-[13px] font-[500] text-[var(--color-text-muted)] mb-[32px]">Students from XLR8Hire have been hired at</p>
        <div className="flex flex-wrap justify-center gap-[32px] md:gap-[56px] opacity-50 grayscale">
          {/* Logo placeholders */}
          {[1,2,3,4,5,6,7].map((i) => (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              key={i} 
              className="w-[100px] h-[24px] bg-[#D1D5DB] rounded-[4px]" 
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// --- FEATURES ---
function Features() {
  return (
    <section id="features" className="bg-white py-[120px]">
      <div className="max-w-[1280px] mx-auto px-[20px] md:px-[48px]">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-[80px]"
        >
          <div className="text-[11px] font-[600] text-[var(--color-accent)] uppercase tracking-[0.1em] mb-[16px]">Platform Capabilities</div>
          <h2 className="text-[32px] sm:text-[48px] font-[700] text-[var(--color-text-primary)] max-w-[720px] mx-auto leading-[1.1] tracking-[-0.025em]">
            Everything you need to get hired without applying
          </h2>
        </motion.div>

        {/* BLOCK 1 */}
        <div className="flex flex-col lg:flex-row items-center gap-[56px] max-w-[1100px] mx-auto mb-[96px]">
          <div className="flex-1 lg:w-[48%]">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
              className="w-[48px] h-[48px] bg-[var(--color-accent-light)] rounded-[12px] flex items-center justify-center mb-[16px]"
            >
              <Brain className="w-[22px] h-[22px] text-[var(--color-accent)]" strokeWidth={1.5} />
            </motion.div>
            <div className="text-[11px] font-[600] text-[var(--color-accent)] uppercase tracking-[0.1em]">Skill Verification</div>
            <h3 className="text-[28px] sm:text-[32px] font-[600] text-[var(--color-text-primary)] mt-[8px] leading-[1.2]">
              AI that actually understands what you can do
            </h3>
            <p className="text-[16px] font-[400] text-[var(--color-text-secondary)] mt-[16px] leading-[1.7]">
              Adaptive technical challenges across 40+ domains. Each assessment intelligently adjusts to your level, producing a verified score that companies actually trust.
            </p>
            <div className="mt-[24px] flex flex-col gap-[10px]">
              {["Real-time AI evaluation", "40+ technical domains", "Bias-free scoring"].map((item, i) => (
                <div key={i} className="flex items-center gap-[10px]">
                  <Check className="w-[16px] h-[16px] text-[var(--color-verified)]" strokeWidth={2} />
                  <span className="text-[14px] font-[500] text-[var(--color-text-primary)]">{item}</span>
                </div>
              ))}
            </div>
            <a href="#" className="inline-block mt-[24px] text-[14px] font-[600] text-[var(--color-accent)] hover:underline">Explore assessments →</a>
          </div>
          
          <div className="flex-1 lg:w-[52%] w-full">
            <motion.div 
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-[#F9FAFB] border border-[var(--color-border)] rounded-[16px] p-[20px] sm:p-[28px] shadow-sm hover:-translate-y-[3px] hover:shadow-[var(--shadow-hover)] transition-all duration-200"
            >
              <div className="text-[11px] font-[600] text-[var(--color-text-muted)] uppercase mb-[12px]">Question 3 of 8</div>
              <div className="w-full h-[6px] bg-[var(--color-border)] rounded-full mb-[24px] overflow-hidden">
                <div className="w-[37.5%] h-full bg-[var(--color-accent)] rounded-full" />
              </div>
              <div className="text-[14px] font-[600] text-[var(--color-text-primary)] mb-[16px]">Implement a debounce function that...</div>
              
              <div className="bg-[#0F172A] rounded-[10px] p-[16px] font-mono text-[12px] text-white mb-[16px] overflow-x-auto">
                <pre><code className="text-[#818CF8]">function</code> <code className="text-[#A7F3D0]">debounce</code>(fn, delay) {'{\n'}
  <code className="text-[#94A3B8]">let</code> timeoutId;{'\n'}
  <code className="text-[#818CF8]">return</code> <code className="text-[#818CF8]">function</code>(...args) {'{\n'}
    <code className="text-[#E2E8F0]">clearTimeout(timeoutId);</code>{'\n'}
    <code className="text-[#E2E8F0]">timeoutId = setTimeout(() {`=>`} {'{'}</code>{'\n'}
      <code className="text-[#E2E8F0]">fn.apply(this, args);</code>{'\n'}
    <code className="text-[#E2E8F0]">{'}'}, delay);</code>{'\n'}
  <code className="text-[#E2E8F0]">{'}'}</code>{'\n'}
{'}'}</pre>
              </div>

              <div className="flex items-center gap-[8px]">
                <span className="relative flex h-[6px] w-[6px]">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[var(--color-accent)]"></span>
                </span>
                <span className="text-[12px] text-[var(--color-text-secondary)]">AI Evaluating...</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* BLOCK 2 (Reversed) */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-[56px] max-w-[1100px] mx-auto mb-[96px]">
          <div className="flex-1 lg:w-[48%]">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
              className="w-[48px] h-[48px] bg-[#ECFDF5] rounded-[12px] flex items-center justify-center mb-[16px]"
            >
              <ShieldCheck className="w-[22px] h-[22px] text-[var(--color-verified)]" strokeWidth={1.5} />
            </motion.div>
            <div className="text-[11px] font-[600] text-[var(--color-verified)] uppercase tracking-[0.1em]">Objective Ranking</div>
            <h3 className="text-[28px] sm:text-[32px] font-[600] text-[var(--color-text-primary)] mt-[8px] leading-[1.2]">
              Verified Talent Scores
            </h3>
            <p className="text-[16px] font-[400] text-[var(--color-text-secondary)] mt-[16px] leading-[1.7]">
              Replace your resume with undeniable proof of skill. Once evaluated, your profile is ranked on a global leaderboard where top companies actively source talent.
            </p>
            <a href="#" className="inline-block mt-[24px] text-[14px] font-[600] text-[var(--color-verified)] hover:underline">View live rankings →</a>
          </div>
          
          <div className="flex-1 lg:w-[52%] w-full">
            <motion.div 
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white border border-[var(--color-border)] rounded-[16px] p-[32px] shadow-[var(--shadow-card)] flex flex-col items-center hover:-translate-y-[3px] hover:shadow-[var(--shadow-hover)] transition-all duration-200"
            >
              <AnimatedScoreRing 
                score={912} 
                size={140} 
                strokeWidth={8} 
                label="Match Score" 
                className="mb-[32px]" 
                scoreClassName="text-[var(--color-text-primary)]" 
                labelClassName="text-[var(--color-text-muted)]" 
              />
              <div className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[8px] p-[16px]">
                <div className="flex justify-between items-center mb-[8px]">
                  <span className="text-[13px] font-[500] text-[var(--color-text-primary)]">Frontend Architecture</span>
                  <span className="font-mono text-[13px] font-[600] text-[var(--color-verified)]">Top 2%</span>
                </div>
                <div className="w-full bg-[var(--color-border)] h-[4px] rounded-full overflow-hidden">
                  <div className="bg-[var(--color-verified)] h-full w-[98%]" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* BLOCK 3 */}
        <div className="flex flex-col lg:flex-row items-center gap-[56px] max-w-[1100px] mx-auto">
          <div className="flex-1 lg:w-[48%]">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
              className="w-[48px] h-[48px] bg-[var(--color-accent-light)] rounded-[12px] flex items-center justify-center mb-[16px]"
            >
              <Briefcase className="w-[22px] h-[22px] text-[var(--color-accent)]" strokeWidth={1.5} />
            </motion.div>
            <div className="text-[11px] font-[600] text-[var(--color-accent)] uppercase tracking-[0.1em]">Semantic Match</div>
            <h3 className="text-[28px] sm:text-[32px] font-[600] text-[var(--color-text-primary)] mt-[8px] leading-[1.2]">
              The right opportunities find you
            </h3>
            <p className="text-[16px] font-[400] text-[var(--color-text-secondary)] mt-[16px] leading-[1.7]">
              Stop sending resumes into the void. Companies use semantic search to define exactly who they need, and our system matches them directly with verified students.
            </p>
          </div>
          
          <div className="flex-1 lg:w-[52%] w-full">
            <motion.div 
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white border border-[var(--color-border)] rounded-[16px] p-[20px] sm:p-[28px] shadow-[var(--shadow-card)] hover:-translate-y-[3px] hover:shadow-[var(--shadow-hover)] transition-all duration-200"
            >
              <div className="flex items-center gap-[12px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[12px] p-[16px] mb-[24px]">
                <Zap className="w-[18px] h-[18px] text-[var(--color-text-muted)]" strokeWidth={1.5} />
                <span className="text-[14px] font-[400] text-[var(--color-text-primary)]">"Find me a top 10% React dev who knows GraphQL"</span>
              </div>

              <div className="flex flex-col gap-[12px]">
                {[1,2].map((i) => (
                  <div key={i} className={cn("border rounded-[12px] p-[16px] flex justify-between items-center", i===1 ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]" : "border-[var(--color-border)] bg-white")}>
                    <div className="flex items-center gap-[12px]">
                      <div className="w-[32px] h-[32px] bg-gray-200 rounded-full" />
                      <div>
                        <div className="text-[14px] font-[600] text-[var(--color-text-primary)]">Student Profile {i}</div>
                        <div className="text-[12px] text-[var(--color-text-secondary)]">React · GraphQL · Next.js</div>
                      </div>
                    </div>
                    <button className={cn("text-[12px] font-[500] px-[12px] py-[6px] rounded-[6px]", i===1 ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]")}>
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </section>
  );
}

// --- HOW IT WORKS ---
function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-[120px]">
      <div className="max-w-[1280px] mx-auto px-[20px] md:px-[48px]">
        
        <div className="text-center mb-[72px]">
          <div className="text-[11px] font-[600] text-[var(--color-text-muted)] uppercase tracking-[0.1em] mb-[16px]">The Process</div>
          <h2 className="text-[32px] sm:text-[48px] font-[700] text-[var(--color-text-primary)] leading-[1.1]">
            From zero to hired in 3 steps
          </h2>
        </div>

        <div className="max-w-[960px] mx-auto relative flex flex-col md:flex-row justify-between gap-[48px] md:gap-0">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-[58px] left-[16.6%] right-[16.6%] h-[1px] border-t border-dashed border-[var(--color-border)]" />

          {[
            { n: "01", t: "Take AI Assessments", d: "Complete adaptive challenges across your tech stack. AI evaluates in real-time.", icon: ClipboardCheck },
            { n: "02", t: "Get Verified & Ranked", d: "Receive your Verified Talent Score and appear in the global leaderboard.", icon: ShieldCheck },
            { n: "03", t: "Companies Find You", d: "Top companies search, filter, and send you interview invites directly.", icon: Briefcase }
          ].map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="flex-1 flex flex-col items-center relative z-10"
            >
              <div className="relative flex justify-center items-center h-[90px] w-[90px] mb-[20px]">
                <span className="absolute font-mono text-[64px] font-[800] text-[var(--color-border-subtle)] select-none pointer-events-none z-0 tracking-tighter">
                  {step.n}
                </span>
                <div className="relative z-10 w-[52px] h-[52px] bg-white border border-[var(--color-border)] rounded-[16px] shadow-sm flex items-center justify-center">
                  <step.icon className="w-[22px] h-[22px] text-[var(--color-accent)]" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-[18px] font-[600] text-[var(--color-text-primary)] text-center">{step.t}</h3>
              <p className="text-[14px] font-[400] text-[var(--color-text-secondary)] leading-[1.65] text-center max-w-[220px] mt-[8px]">
                {step.d}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- LEADERBOARD PREVIEW ---
function Leaderboard() {
  const rows = [
    { rank: "#1", name: "Sarah Chen", uni: "MIT", score: "912", spec: "Full Stack", status: "Open", sCol: "text-[#059669]", rCol: "text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] to-[#D97706]" },
    { rank: "#2", name: "Marcus Johnson", uni: "Stanford", score: "887", spec: "ML/AI", status: "Interviewing", sCol: "text-[#F59E0B]", rCol: "text-[#94A3B8]" },
    { rank: "#3", name: "Priya Patel", uni: "CMU", score: "871", spec: "Backend", status: "Open", sCol: "text-[#059669]", rCol: "text-[#D97706]" },
    { rank: "#4", name: "Liam Torres", uni: "Georgia Tech", score: "856", spec: "Frontend", status: "Placed", sCol: "text-[var(--color-text-muted)]", rCol: "text-[rgba(255,255,255,0.3)]" },
    { rank: "#5", name: "Aisha Rahman", uni: "UC Berkeley", score: "849", spec: "DevOps", status: "Open", sCol: "text-[#059669]", rCol: "text-[rgba(255,255,255,0.3)]" },
  ];

  return (
    <section id="rankings" className="bg-[var(--color-bg-dark)] py-[120px] relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[rgba(79,70,229,0.08)] rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-[1280px] mx-auto px-[20px] md:px-[48px] relative z-10">
        <div className="text-center mb-[56px]">
          <div className="text-[11px] font-[600] text-[rgba(255,255,255,0.4)] uppercase tracking-[0.1em] mb-[16px]">Live Rankings</div>
          <h2 className="text-[32px] sm:text-[48px] font-[700] text-white leading-[1.1] mb-[16px]">
            The Verified Talent Leaderboard
          </h2>
          <p className="text-[17px] font-[400] text-[rgba(255,255,255,0.5)]">
            Real-time rankings. Real skills. Real opportunities.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-[900px] mx-auto bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[20px] overflow-hidden"
        >
          {/* TABLE HEADER */}
          <div className="h-[44px] bg-[rgba(255,255,255,0.04)] px-[28px] flex items-center border-b border-[rgba(255,255,255,0.05)] text-[11px] font-[600] text-[rgba(255,255,255,0.3)] uppercase tracking-[0.08em] hidden md:flex">
            <div className="w-[80px]">Rank</div>
            <div className="flex-1">Student</div>
            <div className="w-[120px]">Score</div>
            <div className="w-[160px]">Specialization</div>
            <div className="w-[120px]">Availability</div>
          </div>

          {/* TABLE BODY */}
          <div className="relative">
            {rows.map((row, i) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center min-h-[64px] px-[20px] md:px-[28px] py-[12px] md:py-0 border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.03)] transition-colors relative z-10 group">
                <div className={cn("w-[80px] font-mono text-[14px] font-[700]", row.rCol)}>{row.rank}</div>
                
                <div className="flex-1 flex items-center gap-[12px] my-[8px] md:my-0">
                  <div className="w-[36px] h-[36px] bg-gray-700 rounded-full flex items-center justify-center text-[12px] text-white font-[600] uppercase border border-[rgba(255,255,255,0.1)]">
                    {row.name.substring(0,2)}
                  </div>
                  <div>
                    <div className="text-[14px] font-[500] text-white leading-tight">{row.name}</div>
                    <div className="text-[12px] text-[rgba(255,255,255,0.4)] mt-[2px]">{row.uni}</div>
                  </div>
                </div>
                
                <div className="w-[120px] my-[4px] md:my-0">
                  <span className="inline-flex items-center justify-center bg-[rgba(5,150,105,0.12)] border border-[rgba(5,150,105,0.25)] text-[var(--color-verified)] font-mono text-[13px] font-[600] rounded-full px-[10px] py-[2px]">
                    {row.score}
                  </span>
                </div>
                
                <div className="w-[160px] text-[14px] text-[rgba(255,255,255,0.6)] my-[4px] md:my-0">
                  {row.spec}
                </div>
                
                <div className="w-[120px] flex md:block justify-end my-[4px] md:my-0">
                  <span className={cn("text-[12px] font-[500]", row.sCol)}>
                    • {row.status}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Fade Out Overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-[120px] bg-gradient-to-t from-[var(--color-bg-dark)] to-transparent z-20 pointer-events-none" />
          </div>
          
          <div className="relative z-30 h-[64px] flex items-center justify-center pb-[16px]">
            <Link href="/dashboard/company/leaderboard" className="text-[14px] font-[600] text-[var(--color-accent)] hover:underline flex items-center gap-[4px]">
              View Full Leaderboard <ArrowRight className="w-[14px] h-[14px]" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// --- TESTIMONIALS ---
function Testimonials() {
  const data = [
    {
      q: "I had been applying for 8 months with no results. XLR8Hire got me an interview at Stripe in 11 days. The score gave me instant credibility.",
      n: "Alex Kim", t: "CS @ MIT", badge: "Hired at Stripe"
    },
    {
      q: "The AI assessment was the most honest technical evaluation I've ever had. Companies reached out within 48 hours of me getting ranked.",
      n: "Jordan Lee", t: "CS @ Stanford", badge: "Hired at Vercel"
    },
    {
      q: "I wasn't even actively looking. Three companies invited me to interview in one week. The leaderboard does the work for you.",
      n: "Priya Mehta", t: "ML @ CMU", badge: "Hired at Anthropic"
    }
  ];

  return (
    <section className="bg-white py-[120px]">
      <div className="max-w-[1280px] mx-auto px-[20px] md:px-[48px]">
        <h2 className="text-[32px] sm:text-[40px] font-[700] text-[var(--color-text-primary)] text-center mb-[56px]">
          Students who stopped applying
        </h2>

        <motion.div 
          variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
          className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-[24px]"
        >
          {data.map((item, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              whileHover={cardHover.whileHover}
              className="bg-white border border-[var(--color-border)] rounded-[16px] p-[32px] shadow-sm hover:shadow-[var(--shadow-hover)] transition-all duration-200 flex flex-col"
            >
              <div className="flex gap-[2px] mb-[20px]">
                {[1,2,3,4,5].map(j => <StarIcon key={j} />)}
              </div>
              <p className="text-[15px] font-[400] text-[var(--color-text-primary)] leading-[1.7] flex-1 mb-[24px]">
                "{item.q}"
              </p>
              <div className="h-[1px] w-full bg-[var(--color-bg-subtle)] mb-[20px]" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[12px]">
                  <div className="w-[40px] h-[40px] rounded-full bg-gray-200 flex items-center justify-center text-[12px] font-bold text-gray-500 uppercase">
                    {item.n.substring(0,2)}
                  </div>
                  <div>
                    <div className="text-[14px] font-[600] text-[var(--color-text-primary)]">{item.n}</div>
                    <div className="text-[13px] text-[var(--color-text-muted)] mt-[2px]">{item.t}</div>
                  </div>
                </div>
              </div>
              <div className="mt-[16px]">
                <span className="inline-block bg-[var(--color-verified-light)] text-[var(--color-verified)] text-[11px] font-[600] px-[8px] py-[4px] rounded-full">
                  {item.badge}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// --- CTA BANNER ---
function CTABanner() {
  return (
    <section id="companies" className="bg-[var(--color-accent)] py-[96px]">
      <div className="max-w-[1280px] mx-auto px-[20px] md:px-[48px] text-center">
        <h2 className="text-[32px] sm:text-[48px] font-[700] text-white max-w-[720px] mx-auto leading-[1.1]">
          Your next opportunity is already searching for you.
        </h2>
        <p className="text-[18px] font-[400] text-[rgba(255,255,255,0.75)] mt-[16px]">
          Get verified. Get ranked. Get discovered.
        </p>
        
        <div className="mt-[40px] flex flex-col sm:flex-row items-center justify-center gap-[12px]">
          <Link href="/signup" className="w-full sm:w-auto">
            <motion.button whileHover={cardHover.whileHover} whileTap={cardHover.whileTap} className="bg-white text-[var(--color-accent)] h-[52px] px-[32px] rounded-[12px] text-[16px] font-[600] hover:bg-gray-50 transition-colors w-full">
              Start For Free
            </motion.button>
          </Link>
          <Link href="/dashboard/company" className="w-full sm:w-auto">
            <motion.button whileHover={cardHover.whileHover} whileTap={cardHover.whileTap} className="bg-[rgba(255,255,255,0.1)] text-white border border-[rgba(255,255,255,0.2)] h-[52px] px-[32px] rounded-[12px] text-[16px] font-[600] hover:bg-[rgba(255,255,255,0.15)] transition-colors w-full">
              For Companies
            </motion.button>
          </Link>
        </div>
        
        <p className="text-[13px] text-[rgba(255,255,255,0.5)] mt-[20px]">
          No credit card required · Free forever for students
        </p>
      </div>
    </section>
  );
}

// --- FOOTER ---
function Footer() {
  return (
    <footer className="bg-[var(--color-bg-dark)] pt-[80px] pb-[40px] border-t border-[rgba(255,255,255,0.06)]">
      <div className="max-w-[1280px] mx-auto px-[20px] md:px-[48px]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-[40px] mb-[64px]">
          
          <div className="md:col-span-1">
            <div className="flex items-center gap-[6px]">
              <Zap className="w-[18px] h-[18px] text-[var(--color-accent)] fill-[var(--color-accent)]" strokeWidth={1.5} />
              <span className="text-[17px] font-[700] text-white">XLR8Hire</span>
            </div>
            <p className="text-[14px] text-[rgba(255,255,255,0.4)] max-w-[220px] mt-[12px]">
              AI-powered reverse hiring for the next generation of talent.
            </p>
            <div className="flex items-center gap-[16px] mt-[20px]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px] text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.7)] transition-colors cursor-pointer"><path d="M4 4l11.733 16h4.267l-11.733 -16z"></path><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path></svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px] text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.7)] transition-colors cursor-pointer"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px] text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.7)] transition-colors cursor-pointer"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </div>
          </div>

          {[
            { title: "Product", links: [
              { label: "Rankings", href: "#rankings" },
              { label: "Assessments", href: "#features" },
              { label: "AI Interview", href: "#features" },
              { label: "Leaderboard", href: "/dashboard/company/leaderboard" },
              { label: "Companies", href: "#companies" }
            ]},
            { title: "Company", links: [
              { label: "About", href: "#" },
              { label: "Blog", href: "#" },
              { label: "Careers", href: "#" },
              { label: "Press", href: "#" },
              { label: "Privacy", href: "/privacy" }
            ]},
            { title: "Students", links: [
              { label: "How It Works", href: "#how-it-works" },
              { label: "Pricing", href: "#companies" },
              { label: "Documentation", href: "#" },
              { label: "Support", href: "#" },
              { label: "Status", href: "#" }
            ]}
          ].map((col, i) => (
            <div key={i} className="flex flex-col">
              <div className="text-[12px] font-[600] text-[rgba(255,255,255,0.3)] uppercase tracking-[0.08em] mb-[16px]">{col.title}</div>
              {col.links.map(link => (
                <Link key={link.label} href={link.href} className="text-[14px] text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.85)] leading-[2.2] transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-[32px] border-t border-[rgba(255,255,255,0.06)] gap-[16px] md:gap-0">
          <div className="text-[13px] text-[rgba(255,255,255,0.3)]">
            © 2025 XLR8Hire. All rights reserved.
          </div>
          <div className="flex items-center gap-[24px]">
            {["Terms", "Privacy", "Cookies"].map(link => (
              <a key={link} href="#" className="text-[13px] text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// --- MAIN PAGE EXPORT ---
export default function LandingPage() {
  return (
    <main className="w-full flex flex-col bg-[var(--color-bg-primary)]">
      <Navbar />
      <Hero />
      <LogoStrip />
      <Features />
      <HowItWorks />
      <Leaderboard />
      <Testimonials />
      <CTABanner />
      <Footer />
    </main>
  );
}