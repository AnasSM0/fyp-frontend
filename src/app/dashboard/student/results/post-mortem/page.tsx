"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, Bot, User, Code2, Sparkles, TrendingUp, 
  Lightbulb, ArrowLeft, Send, Zap, ChevronRight,
  MessageCircle, BarChart3, Target, BookOpen, Rocket
} from "lucide-react";
import Link from "next/link";
import { MeshBackground } from "@/components/ui/mesh-background";
import { staggerContainer, staggerItem, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedbackItem {
  id: string;
  type: "optimization" | "soft-skill" | "insight" | "roadmap";
  title: string;
  content: string;
  codeSnippet?: {
    original: string;
    improved: string;
    explanation: string;
  };
}

interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
  feedback?: FeedbackItem;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    role: "ai",
    text: "Great job completing the assessment! I've spent the last few minutes deep-diving into your code, your logic, and even your conversational patterns. Ready for a deep debrief?"
  },
  {
    id: "2",
    role: "ai",
    text: "Overall, your algorithmic reasoning was sharp, but there are some high-impact optimizations we can make to your Python implementation. Where should we start?"
  }
];

const FEEDBACK_DATABASE: Record<string, FeedbackItem> = {
  optimization: {
    id: "opt-1",
    type: "optimization",
    title: "Memory Efficiency in TwoSum",
    content: "Your hash map approach was correct (O(n)), but we can improve the memory overhead by avoiding unnecessary object creation in the loop.",
    codeSnippet: {
      original: "for i, num in enumerate(nums):\n    complement = target - num\n    if complement in num_map:\n        return [num_map[complement], i]\n    num_map[num] = i",
      improved: "for i, num in enumerate(nums):\n    if (complement := target - num) in num_map:\n        return [num_map[complement], i]\n    num_map[num] = i",
      explanation: "Using the walrus operator (:=) in Python 3.8+ allows you to assign and check in one step, slightly reducing byte-code overhead and making the logic more concise."
    }
  },
  softSkill: {
    id: "ss-1",
    type: "soft-skill",
    title: "Communication Clarity",
    content: "When explaining your hash map logic, you were very clear. However, you paused for 12 seconds before explaining the space complexity. In a real interview, thinking out loud during those pauses keeps the interviewer engaged.",
  },
  roadmap: {
    id: "rm-1",
    type: "roadmap",
    title: "Your 14-Day Growth Plan",
    content: "Based on your performance, I've curated a roadmap focusing on: \n1. Advanced Python memory management \n2. System Design scalability patterns \n3. Concurrent programming in high-load systems.",
  }
};

// ─── Components ───────────────────────────────────────────────────────────────

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const [showCode, setShowCode] = useState(false);

  return (
    <motion.div 
      variants={staggerItem}
      className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:border-violet-500/30 transition-all group"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
          item.type === "optimization" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
          item.type === "soft-skill" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
          "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        )}>
          {item.type === "optimization" ? <Zap className="w-5 h-5" /> : 
           item.type === "soft-skill" ? <MessageCircle className="w-5 h-5" /> : 
           <Rocket className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
          <p className="text-sm text-white/50 leading-relaxed">{item.content}</p>
        </div>
      </div>

      {item.codeSnippet && (
        <div className="mt-4">
          <button 
            onClick={() => setShowCode(!showCode)}
            className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1.5"
          >
            <Code2 className="w-3.5 h-3.5" />
            {showCode ? "Hide Optimization" : "View Optimized Code"}
            <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showCode && "rotate-90")} />
          </button>
          
          <AnimatePresence>
            {showCode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-4">
                  <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-[13px]">
                    <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Original Implementation</div>
                    <pre className="text-white/40">{item.codeSnippet.original}</pre>
                  </div>
                  <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10 font-mono text-[13px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2">
                      <div className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-widest">Recommended</div>
                    </div>
                    <div className="text-[10px] text-emerald-400/40 uppercase tracking-widest mb-2">Optimized Version</div>
                    <pre className="text-emerald-300">{item.codeSnippet.improved}</pre>
                  </div>
                  <div className="text-[13px] text-white/40 leading-relaxed flex items-start gap-2 bg-white/5 p-3 rounded-lg italic">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{item.codeSnippet.explanation}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export default function PostMortemPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (role: "ai" | "user", text: string, feedback?: FeedbackItem) => {
    const newMessage: ChatMessage = {
      id: Math.random().toString(),
      role,
      text,
      feedback
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const userText = inputValue;
    addMessage("user", userText);
    setInputValue("");
    
    // Simulate AI response logic
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const lowerText = userText.toLowerCase();
      
      if (lowerText.includes("code") || lowerText.includes("optimize")) {
        addMessage("ai", "Spot on. Let's look at your memory footprint. You utilized a dictionary effectively, but we can make the inner loop even leaner.", FEEDBACK_DATABASE.optimization);
      } else if (lowerText.includes("soft") || lowerText.includes("communication")) {
        addMessage("ai", "Interviewing is 50% communication. You did great, but there's a nuance in your pausing that we can polish.", FEEDBACK_DATABASE.softSkill);
      } else if (lowerText.includes("next") || lowerText.includes("roadmap")) {
        addMessage("ai", "I've synthesized a specific path for you to bridge your current level to Senior Engineer standards.", FEEDBACK_DATABASE.roadmap);
      } else {
        addMessage("ai", "I can help you dive into three specific areas: Code Optimizations, Soft Skill Analysis, or your long-term Growth Roadmap. Which one interests you?");
      }
    }, 1500);
  };

  return (
    <div className="relative min-h-screen bg-[#09090e] text-white overflow-hidden flex flex-col">
      <MeshBackground />

      {/* ── Header ── */}
      <header className="relative z-20 h-16 border-b border-white/10 bg-black/20 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/student/results">
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-white/60" />
            </button>
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold tracking-tight">AI Post-Mortem</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-[0.2em]">
            Session ID: #VER-4092
          </div>
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/10">
            Export Transcript
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left: Chat Interface (60%) */}
        <section className="flex-1 flex flex-col border-r border-white/5">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scrollbar-hide">
            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              {messages.map((msg, i) => (
                <motion.div 
                  key={msg.id}
                  variants={fadeUp}
                  className={cn(
                    "flex gap-4 mb-8",
                    msg.role === "user" ? "flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                    msg.role === "ai" 
                      ? "bg-violet-500/10 border-violet-500/20 text-violet-400" 
                      : "bg-white/5 border-white/10 text-white/60"
                  )}>
                    {msg.role === "ai" ? <Bot className="w-5 h-5" strokeWidth={1.5} /> : <User className="w-5 h-5" strokeWidth={1.5} />}
                  </div>
                  <div className={cn(
                    "max-w-[85%] md:max-w-[70%] space-y-4",
                    msg.role === "user" ? "text-right" : ""
                  )}>
                    <div className={cn(
                      "p-4 rounded-2xl text-[15px] leading-[1.6]",
                      msg.role === "ai" 
                        ? "bg-white/[0.03] text-white/80" 
                        : "bg-violet-600 text-white font-medium"
                    )}>
                      {msg.text}
                    </div>
                    {msg.feedback && (
                      <div className="text-left mt-4">
                        <FeedbackCard item={msg.feedback} />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex gap-4 mb-8">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-violet-400 animate-pulse" />
                  </div>
                  <div className="bg-white/[0.03] p-4 rounded-2xl flex gap-1">
                    <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </motion.div>
          </div>

          {/* Input Box */}
          <div className="p-6 bg-black/40 border-t border-white/5">
            <div className="max-w-4xl mx-auto flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 px-4 focus-within:border-violet-500/50 transition-all shadow-2xl">
              <input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about your code, soft skills, or roadmap..."
                className="flex-1 bg-transparent border-none outline-none text-sm py-3 placeholder:text-white/20"
              />
              <button 
                onClick={handleSend}
                className="p-3 bg-violet-600 hover:bg-violet-500 rounded-xl transition-all shadow-lg"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="max-w-4xl mx-auto flex flex-wrap gap-2 mt-4 justify-center">
              {[
                "Optimize my code",
                "How was my confidence?",
                "Give me a study plan",
                "Show more optimizations"
              ].map(tag => (
                <button 
                  key={tag}
                  onClick={() => setInputValue(tag)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 hover:text-white/80 hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right: Insights Panel (40%) */}
        <section className="hidden lg:flex w-[400px] flex-col bg-white/[0.01] p-8 space-y-8 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">Interview DNA</h2>
            </div>
            
            <div className="space-y-4">
              {[
                { label: "Technical Maturity", value: 88, icon: Target },
                { label: "Execution Speed", value: 94, icon: Zap },
                { label: "Semantic Clarity", value: 72, icon: BarChart3 },
                { label: "Edge Case Awareness", value: 65, icon: BookOpen },
              ].map(stat => (
                <div key={stat.label} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-white/60">
                      <stat.icon className="w-3.5 h-3.5" />
                      {stat.label}
                    </div>
                    <span className="font-mono text-violet-400 font-bold">{stat.value}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.value}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 space-y-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">Career Trajectory</h2>
            </div>
            <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-3">
              <p className="text-[13px] text-white/70 leading-relaxed font-medium">
                "Your performance in 'Algorithmic Optimization' puts you in the top 4% of Senior candidates."
              </p>
              <div className="text-[11px] text-emerald-400/60 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Verified by XLR8Hire AI Engine
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
