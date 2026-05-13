"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Terminal, Sparkles, Briefcase, Rocket, 
  Star, Send, User, Bot, CheckCircle2,
  ArrowRight, Loader2, Target
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MeshBackground } from "@/components/ui/mesh-background";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "ai" | "user";
  text: string;
  type?: "input" | "select" | "final";
  field?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: "name",
    question: "First things first, what's your full name?",
    placeholder: "e.g. Alex Rivera",
    field: "name"
  },
  {
    id: "role",
    question: "Great to meet you! What's the role you're currently aiming for?",
    placeholder: "e.g. Senior Frontend Engineer",
    field: "role"
  },
  {
    id: "stack",
    question: "Technical DNA time. What's your primary tech stack? (Frameworks, Languages)",
    placeholder: "e.g. React, TypeScript, Rust",
    field: "stack"
  },
  {
    id: "project",
    question: "Impressive. Tell me about your highest-impact project. What did you build?",
    placeholder: "Describe the complexity and your role...",
    field: "project"
  },
  {
    id: "goal",
    question: "Last one. Where do you want the AI to take your career in the next 2 years?",
    placeholder: "e.g. Scaling AI startups, Leadership...",
    field: "goal"
  }
];

export default function ConversationalOnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "ai", text: "Welcome to XLR8Hire. I'm your AI recruiter. I'm here to map your technical DNA and build your elite talent profile." }
  ]);
  const [step, setStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger first question
    setTimeout(() => {
      askQuestion(0);
    }, 1500);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const askQuestion = (index: number) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const q = QUESTIONS[index];
      setMessages(prev => [...prev, { id: q.id, role: "ai", text: q.question, type: "input", field: q.field }]);
    }, 1200);
  };

  const handleSend = () => {
    if (!inputValue.trim() || isFinished) return;

    const currentQ = QUESTIONS[step];
    const userText = inputValue;
    
    // Add user message
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: userText }]);
    setFormData(prev => ({ ...prev, [currentQ.field]: userText }));
    setInputValue("");

    if (step < QUESTIONS.length - 1) {
      setStep(s => s + 1);
      askQuestion(step + 1);
    } else {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { 
          id: "final", 
          role: "ai", 
          text: "Identity construction complete. Your technical DNA has been synthesized. Ready to enter the marketplace?",
          type: "final"
        }]);
        setIsFinished(true);
      }, 1500);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col font-sans antialiased overflow-hidden">
      <MeshBackground />

      {/* Header */}
      <header className="relative z-20 h-20 px-8 flex items-center justify-between bg-[var(--color-bg-primary)]/20 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">XLR8Hire</span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-widest">
              AI Onboarding
            </span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Experience */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left: Chat Flow (70%) */}
        <section className="flex-1 flex flex-col border-r border-[var(--color-border)]">
          <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 no-scrollbar">
            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              <AnimatePresence mode="popLayout">
                {messages.map((msg) => (
                  <motion.div 
                    key={msg.id}
                    variants={fadeUp}
                    layout
                    className={cn(
                      "flex gap-4 mb-8",
                      msg.role === "user" ? "flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg",
                      msg.role === "ai" 
                        ? "bg-violet-600 border-violet-400 text-white" 
                        : "bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                    )}>
                      {msg.role === "ai" ? <Bot className="w-6 h-6" strokeWidth={1.5} /> : <User className="w-6 h-6" strokeWidth={1.5} />}
                    </div>
                    <div className={cn(
                      "max-w-[85%] md:max-w-[70%] space-y-2",
                      msg.role === "user" ? "text-right" : ""
                    )}>
                      <div className={cn(
                        "p-5 rounded-3xl text-[16px] leading-[1.6] shadow-xl",
                        msg.role === "ai" 
                          ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded-tl-none border border-[var(--color-border)]" 
                          : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-medium rounded-tr-none"
                      )}>
                        {msg.text}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-widest font-bold px-2">
                        {msg.role === "ai" ? "AI Agent" : "You"}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-violet-600 border border-violet-400 flex items-center justify-center shadow-lg">
                    <Bot className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div className="bg-[var(--color-bg-secondary)] p-5 rounded-3xl rounded-tl-none border border-[var(--color-border)] flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full animate-bounce" />
                  </div>
                </motion.div>
              )}
              <div ref={scrollRef} />
            </motion.div>
          </div>

          {/* Input Area */}
          <div className="p-8 bg-[var(--color-bg-secondary)]/40 border-t border-[var(--color-border)]">
            <div className="max-w-3xl mx-auto relative">
              {!isFinished ? (
                <div className="flex items-center gap-4 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-[24px] p-2 pr-4 focus-within:border-violet-500/50 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all shadow-2xl">
                  <input 
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder={QUESTIONS[step]?.placeholder || "Type your response..."}
                    className="flex-1 bg-transparent border-none outline-none text-[16px] px-4 py-3 placeholder:text-[var(--color-text-muted)] text-[var(--color-text-primary)]"
                  />
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    className="p-4 bg-violet-600 hover:bg-violet-500 rounded-[20px] transition-all shadow-lg shadow-violet-600/20"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </motion.button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <Link href="/dashboard/student">
                    <button className="w-full h-16 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[24px] font-bold text-lg flex items-center justify-center gap-3 hover:shadow-[0_0_40px_rgba(139,92,246,0.3)] transition-all">
                      <CheckCircle2 className="w-6 h-6" />
                      Initialize Talent Dashboard
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  </Link>
                </motion.div>
              )}
              <div className="flex justify-center gap-6 mt-6">
                {QUESTIONS.map((q, i) => (
                  <div 
                    key={q.id} 
                    className={cn(
                      "h-1 rounded-full transition-all duration-500",
                      i === step ? "w-12 bg-violet-500" : i < step ? "w-4 bg-emerald-500" : "w-4 bg-[var(--color-border)]"
                    )} 
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Right: Real-time Profile Synthesis (30%) */}
        <section className="hidden xl:flex w-[450px] flex-col bg-[var(--color-bg-secondary)]/10 p-10 space-y-10 overflow-y-auto border-l border-[var(--color-border)]">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.3em] text-[var(--color-text-muted)]">Profile Synthesis</h2>
            </div>

            <div className="space-y-8">
              {/* Name Display */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Legal Name</div>
                <div className="h-12 flex items-center px-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl text-[18px] font-bold text-[var(--color-text-primary)]">
                  {formData.name || <span className="text-[var(--color-text-muted)]/30 font-mono">AWAITING_INPUT</span>}
                </div>
              </div>

              {/* Role Badge */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Target Designation</div>
                <div className={cn(
                  "h-12 flex items-center px-4 rounded-2xl text-[15px] font-bold transition-all",
                  formData.role ? "bg-violet-500/10 border border-violet-500/30 text-violet-300" : "bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)]/30"
                )}>
                  {formData.role || "UNDETERMINED"}
                </div>
              </div>

              {/* Tech Stack Chips */}
              <div className="space-y-4">
                <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Tech DNA Vectors</div>
                <div className="flex flex-wrap gap-2">
                  {formData.stack ? formData.stack.split(",").map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-full text-[12px] font-mono font-semibold text-[var(--color-text-secondary)]">
                      {tag.trim()}
                    </span>
                  )) : (
                    <div className="w-full h-24 rounded-2xl border border-dashed border-[var(--color-border)] flex items-center justify-center">
                      <Terminal className="w-6 h-6 text-[var(--color-text-muted)]/30" />
                    </div>
                  )}
                </div>
              </div>

              {/* Project Abstract */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Project Abstract</div>
                <div className="p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl text-[13px] leading-relaxed text-[var(--color-text-secondary)] min-h-[100px]">
                  {formData.project || "Analysis of high-impact work pending..."}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-[var(--color-border)] space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-violet-400" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Marketplace Fit Preview</h2>
              </div>
              
              {/* Visual Match Map */}
              <div className="h-40 bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border)] relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent)]" />
                
                {/* Simulated Nodes */}
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute w-24 h-24 bg-violet-500/20 rounded-full blur-2xl" 
                />
                
                <div className="relative z-10 text-center">
                  <div className="text-[24px] font-mono font-bold text-[var(--color-text-primary)] mb-1">
                    {formData.stack ? "94.2%" : "--.-%"}
                  </div>
                  <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Semantic Congruence</div>
                </div>

                {/* Floating Tech Orbits */}
                {formData.stack && formData.stack.split(",").slice(0, 3).map((tag, i) => (
                  <motion.div
                    key={tag}
                    animate={{ 
                      x: [0, (i % 2 === 0 ? 40 : -40), 0],
                      y: [0, (i % 2 === 0 ? -20 : 20), 0]
                    }}
                    transition={{ duration: 5 + i, repeat: Infinity, ease: "linear" }}
                    className="absolute text-[9px] font-mono font-bold text-[var(--color-text-muted)] uppercase px-2 py-1 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-md"
                    style={{ 
                      left: `${30 + (i * 20)}%`,
                      top: `${20 + (i * 25)}%`
                    }}
                  >
                    {tag.trim()}
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                <span className="text-[var(--color-text-muted)]">Synthesis Progress</span>
                <span className="text-emerald-400">{Math.round((step / QUESTIONS.length) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / QUESTIONS.length) * 100}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                />
              </div>
            </div>

            {/* Emerging Matches */}
            <div className="space-y-4">
              <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Emerging Marketplace Matches</div>
              <div className="flex gap-4 opacity-40 grayscale group-hover:grayscale-0 transition-all">
                <div className="w-8 h-8 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center font-bold text-[10px] text-[var(--color-text-primary)]">T</div>
                <div className="w-8 h-8 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center font-bold text-[10px] text-[var(--color-text-primary)]">F</div>
                <div className="w-8 h-8 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center font-bold text-[10px] text-[var(--color-text-primary)]">G</div>
                <div className="w-8 h-8 rounded bg-[var(--color-bg-secondary)] border border-dashed border-[var(--color-border)] flex items-center justify-center font-bold text-[10px] text-[var(--color-text-muted)]">+12</div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
