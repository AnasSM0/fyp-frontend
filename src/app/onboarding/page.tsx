"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, Sparkles, Rocket,
  Send, User, Bot, CheckCircle2,
  ArrowRight, Loader2, Target
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MeshBackground } from "@/components/ui/mesh-background";
import { RagDebugPanel } from "@/components/debug/rag-debug-panel";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";
import {
  canUseProfileDemoFallback,
  getCandidateProfile,
  isCandidateProfileMissing,
  profileErrorMessage,
  updateCandidateProfile,
} from "@/lib/api/profile-service";
import { CandidateProfile, CandidateProfileUpdate } from "@/lib/api/types";
import {
  canUseOnboardingAIDemoFallback,
  onboardingAIErrorMessage,
  sendOnboardingChatMessage,
} from "@/lib/api/onboarding-ai-service";
import { OnboardingChatResponse, OnboardingConversationMessage, OnboardingProfileDraft } from "@/lib/api/types";
import { providerLabel } from "@/lib/candidate-view-adapters";

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

function splitProfileList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function textValue(value: string | undefined, fallback: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  return fallback ?? null;
}

function buildCandidateProfilePayload(
  formData: Record<string, string>,
  aiProfileDraft: OnboardingProfileDraft | null,
  existingProfile: CandidateProfile | null
): CandidateProfileUpdate {
  const parsedStack = splitProfileList(formData.stack);
  const aiStack = [...(aiProfileDraft?.tech_stack ?? []), ...(aiProfileDraft?.skills ?? [])];
  const existingStack = existingProfile?.tech_stack ?? [];
  const nextStack = parsedStack.length > 0 ? parsedStack : aiStack.length > 0 ? aiStack : existingStack;

  return {
    full_name: textValue(formData.name, aiProfileDraft?.full_name ?? existingProfile?.full_name),
    university: existingProfile?.university ?? null,
    degree: existingProfile?.degree ?? null,
    graduation_year: existingProfile?.graduation_year ?? null,
    gpa: existingProfile?.gpa ?? null,
    target_role: textValue(formData.role, aiProfileDraft?.target_role ?? existingProfile?.target_role),
    experience_level: aiProfileDraft?.experience_level ?? existingProfile?.experience_level ?? "student",
    tech_stack: nextStack,
    skills: nextStack.length > 0 ? nextStack : existingProfile?.skills ?? [],
    portfolio_url: existingProfile?.portfolio_url ?? null,
    linkedin_url: existingProfile?.linkedin_url ?? null,
    resume_url: existingProfile?.resume_url ?? null,
    profile_visibility: existingProfile?.profile_visibility ?? false,
    availability_status: existingProfile?.availability_status ?? "open",
    profile_complete: true,
  };
}

function buildOnboardingDraft(
  formData: Record<string, string>,
  aiProfileDraft: OnboardingProfileDraft | null
): OnboardingProfileDraft {
  const stack = splitProfileList(formData.stack);
  return {
    ...aiProfileDraft,
    full_name: textValue(formData.name, aiProfileDraft?.full_name),
    target_role: textValue(formData.role, aiProfileDraft?.target_role),
    tech_stack: stack.length > 0 ? stack : aiProfileDraft?.tech_stack ?? [],
    skills: stack.length > 0 ? stack : aiProfileDraft?.skills ?? [],
    experience_level: aiProfileDraft?.experience_level ?? "student",
    availability_status: aiProfileDraft?.availability_status ?? "open",
    project_summary: textValue(formData.project, aiProfileDraft?.project_summary),
    career_goal: textValue(formData.goal, aiProfileDraft?.career_goal),
  };
}

function messagesToBackendHistory(messages: Message[]): OnboardingConversationMessage[] {
  return messages.map((message) => ({
    role: message.role === "ai" ? "assistant" : "user",
    content: message.text,
  }));
}

export default function ConversationalOnboardingPage() {
  const router = useRouter();
  const { completeProfile } = useMarketplaceStore();
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "ai", text: "Welcome to XLR8Hire. I'm your AI recruiter. I'm here to map your technical DNA and build your elite talent profile." }
  ]);
  const [step, setStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<OnboardingChatResponse | null>(null);
  const [aiProfileDraft, setAiProfileDraft] = useState<OnboardingProfileDraft | null>(null);
  const [aiFallbackNotice, setAiFallbackNotice] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      askQuestion(0);
    }, 1500);

    return () => window.clearTimeout(timer);
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

  const handleSend = async () => {
    if (!inputValue.trim() || isFinished) return;

    const currentQ = QUESTIONS[step];
    const userText = inputValue;
    const nextFormData = { ...formData, [currentQ.field]: userText };
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: userText }]);
    setFormData(nextFormData);
    setInputValue("");
    setProfileError(null);
    setAiFallbackNotice(null);

    try {
      setIsTyping(true);
      const response = await sendOnboardingChatMessage({
        current_profile: buildOnboardingDraft(nextFormData, aiProfileDraft),
        user_message: userText,
        conversation_history: messagesToBackendHistory(messages),
        current_step: currentQ.id,
      });

      const mergedDraft = {
        ...aiProfileDraft,
        ...response.extracted_fields,
        target_role: response.extracted_fields.target_role ?? response.inferred_target_role ?? aiProfileDraft?.target_role,
        experience_level:
          response.extracted_fields.experience_level ??
          response.inferred_experience_level ??
          aiProfileDraft?.experience_level,
        skills: response.extracted_fields.skills?.length
          ? response.extracted_fields.skills
          : response.suggested_skills.length
            ? response.suggested_skills
            : aiProfileDraft?.skills,
      };
      setAiResponse(response);
      setAiProfileDraft(mergedDraft);
      setIsTyping(false);

      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: "ai",
        text:
          step < QUESTIONS.length - 1 && response.next_question
            ? `${response.assistant_message}\n\n${response.next_question}`
            : response.assistant_message,
        type: step < QUESTIONS.length - 1 ? "input" : "final",
      }]);

      if (step < QUESTIONS.length - 1) {
        setStep(s => s + 1);
      } else {
        setIsFinished(true);
      }
    } catch (error) {
      setIsTyping(false);
      if (canUseOnboardingAIDemoFallback(error)) {
        setAiFallbackNotice("AI onboarding backend unavailable. Continuing with local guided onboarding.");
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
        return;
      }

      setProfileError(onboardingAIErrorMessage(error));
    }
  };

  const applyAISuggestions = () => {
    if (!aiResponse) return;
    const suggestedSkills = Array.from(
      new Set([
        ...(aiResponse.extracted_fields.tech_stack ?? []),
        ...(aiResponse.extracted_fields.skills ?? []),
        ...aiResponse.suggested_skills,
      ])
    );
    setFormData(prev => ({
      ...prev,
      role: aiResponse.inferred_target_role ?? aiResponse.extracted_fields.target_role ?? prev.role ?? "",
      stack: suggestedSkills.length ? suggestedSkills.join(", ") : prev.stack ?? "",
    }));
    setProfileNotice("AI role and skill suggestions applied. Review before saving.");
  };

  const completeLocalProfile = async (notice: string) => {
    completeProfile();
    setProfileNotice(notice);
    await new Promise((resolve) => setTimeout(resolve, 500));
    router.push("/dashboard/student");
  };

  const handleCompleteProfile = async () => {
    if (isSavingProfile) return;
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileNotice(null);

    try {
      let existingProfile: CandidateProfile | null = null;
      try {
        existingProfile = await getCandidateProfile();
      } catch (error) {
        if (isCandidateProfileMissing(error)) {
          existingProfile = null;
        } else if (canUseProfileDemoFallback(error)) {
          await completeLocalProfile("Backend unavailable. Continuing with local demo profile.");
          return;
        } else {
          setProfileError(profileErrorMessage(error));
          return;
        }
      }

      await updateCandidateProfile(buildCandidateProfilePayload(formData, aiProfileDraft, existingProfile));
      completeProfile();
      setProfileNotice("Profile saved. Opening your student dashboard...");
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/dashboard/student");
    } catch (error) {
      if (canUseProfileDemoFallback(error)) {
        await completeLocalProfile("Backend unavailable. Continuing with local demo profile.");
      } else {
        setProfileError(profileErrorMessage(error));
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[var(--color-bg-primary)] font-sans text-[var(--color-text-primary)] antialiased">
      <MeshBackground />

      {/* Header */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/80 px-4 backdrop-blur-md md:px-6">
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
      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        
        {/* Left: Chat Flow (70%) */}
        <section className="flex min-h-0 flex-1 flex-col border-r border-[var(--color-border)]">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 space-y-6 no-scrollbar">
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
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border shadow-lg md:h-10 md:w-10",
                      msg.role === "ai" 
                        ? "bg-violet-600 border-violet-400 text-white" 
                        : "bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                    )}>
                      {msg.role === "ai" ? <Bot className="w-6 h-6" strokeWidth={1.5} /> : <User className="w-6 h-6" strokeWidth={1.5} />}
                    </div>
                    <div className={cn(
                      "max-w-[88%] space-y-2 md:max-w-[72%]",
                      msg.role === "user" ? "text-right" : ""
                    )}>
                      <div className={cn(
                        "whitespace-pre-wrap rounded-3xl p-4 text-[15px] leading-[1.55] shadow-xl md:p-5 md:text-[16px]",
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
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-violet-400 bg-violet-600 shadow-lg md:h-10 md:w-10">
                    <Bot className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div className="bg-[var(--color-bg-secondary)] p-5 rounded-3xl rounded-tl-none border border-[var(--color-border)] flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full animate-bounce" />
                  </div>
                </motion.div>
              )}
              {(aiResponse || aiFallbackNotice) && (
                <motion.div variants={fadeUp} className="mb-6 ml-12 max-w-[720px] rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 text-[13px] leading-6 text-[var(--color-text-secondary)] md:ml-14">
                  {aiResponse && (
                    <div className="space-y-2">
                      <div className="font-bold text-[var(--color-text-primary)]">
                        AI suggestions ({providerLabel(aiResponse.provider_metadata)}
                        {aiResponse.provider_metadata.fallback_used ? " fallback" : ""})
                      </div>
                      <div>
                        Role: <span className="font-semibold">{aiResponse.inferred_target_role ?? aiResponse.extracted_fields.target_role ?? "Not inferred yet"}</span>
                      </div>
                      <div>
                        Skills: <span className="font-semibold">{[
                          ...(aiResponse.extracted_fields.tech_stack ?? []),
                          ...(aiResponse.extracted_fields.skills ?? []),
                          ...aiResponse.suggested_skills,
                        ].slice(0, 8).join(", ") || "Not enough evidence yet"}</span>
                      </div>
                      {aiResponse.missing_fields.length > 0 && (
                        <div>Missing: {aiResponse.missing_fields.slice(0, 4).join(", ")}</div>
                      )}
                      <button
                        type="button"
                        onClick={applyAISuggestions}
                        className="mt-2 rounded-[10px] bg-violet-600 px-3 py-2 text-[12px] font-bold text-white hover:bg-violet-500"
                      >
                        Apply role and skill suggestions
                      </button>
                    </div>
                  )}
                  {aiFallbackNotice && <div className="font-semibold text-violet-200">{aiFallbackNotice}</div>}
                </motion.div>
              )}
              <RagDebugPanel
                title="Onboarding AI"
                summary="Provider and retrieved onboarding context returned by the backend."
                className="mb-6 ml-12 max-w-[720px] md:ml-14"
                metadata={{
                  provider_metadata: aiResponse?.provider_metadata,
                  retrieved_context_metadata: aiResponse?.retrieved_context_metadata,
                  fallback_notice: aiFallbackNotice,
                }}
              />
              <div ref={scrollRef} />
            </motion.div>
          </div>

          {/* Input Area */}
          <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]/80 p-4 backdrop-blur-md md:p-5">
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
                    className="rounded-[18px] bg-violet-600 p-3.5 shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </motion.button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  {profileError ? (
                    <div className="mb-4 rounded-[16px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-[13px] font-semibold text-red-200" role="alert">
                      {profileError}
                    </div>
                  ) : null}
                  {profileNotice ? (
                    <div className="mb-4 rounded-[16px] border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-[13px] font-semibold text-violet-100" aria-live="polite">
                      {profileNotice}
                    </div>
                  ) : null}
                  <button
                    onClick={handleCompleteProfile}
                    disabled={isSavingProfile}
                    className="w-full h-16 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[24px] font-bold text-lg flex items-center justify-center gap-3 hover:shadow-[0_0_40px_rgba(139,92,246,0.3)] transition-all disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-6 h-6" />
                        Initialize Talent Dashboard
                        <ArrowRight className="w-6 h-6" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}
              <div className="mt-4 flex justify-center gap-4">
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
        <section className="hidden w-[400px] flex-col space-y-6 overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30 p-6 xl:flex">
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
