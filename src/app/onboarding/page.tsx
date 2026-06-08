"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Briefcase,
  Check,
  CheckCircle2,
  Code2,
  FolderOpen,
  GraduationCap,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { RagDebugPanel } from "@/components/debug/rag-debug-panel";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MeshBackground } from "@/components/ui/mesh-background";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";
import { providerLabel } from "@/lib/candidate-view-adapters";
import {
  canUseOnboardingAIDemoFallback,
  onboardingAIErrorMessage,
  sendOnboardingChatMessage,
} from "@/lib/api/onboarding-ai-service";
import {
  canUseProfileDemoFallback,
  getCandidateProfile,
  isCandidateProfileMissing,
  profileErrorMessage,
  updateCandidateProfile,
} from "@/lib/api/profile-service";
import {
  CandidateProfile,
  CandidateProfileUpdate,
  OnboardingChatResponse,
  OnboardingProfileDraft,
} from "@/lib/api/types";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

type BuilderStep = "identity" | "role" | "skills" | "projects" | "blueprint";

interface BuilderForm {
  fullName: string;
  university: string;
  degree: string;
  graduationYear: string;
  gpa: string;
  targetRole: string;
  experienceLevel: string;
  careerGoal: string;
  preferredWorkType: string;
  skills: string[];
  projectSummary: string;
  projectContribution: string;
  projectStack: string;
  hardestChallenge: string;
  portfolioUrl: string;
  linkedinUrl: string;
  resumeUrl: string;
}

const STEPS: Array<{ id: BuilderStep; label: string; icon: typeof GraduationCap }> = [
  { id: "identity", label: "Identity", icon: GraduationCap },
  { id: "role", label: "Target Role", icon: Briefcase },
  { id: "skills", label: "Skills", icon: Code2 },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "blueprint", label: "Blueprint", icon: Brain },
];

const ROLE_CARDS = [
  { role: "Frontend Developer", focus: "React UI, accessibility, performance, and frontend architecture." },
  { role: "Backend Developer", focus: "API design, validation, auth, database integration, and reliability." },
  { role: "Full Stack Developer", focus: "Frontend, backend APIs, database modeling, integration, and debugging." },
  { role: "AI/ML Engineer", focus: "ML fundamentals, Python, model evaluation, data workflows, and applied AI." },
  { role: "Database Engineer", focus: "Schema design, SQL, indexing, data integrity, and query optimization." },
];

const EXPERIENCE_LEVELS = ["student", "junior", "internship-ready", "project-experienced"];
const WORK_TYPES = ["Frontend-heavy", "Backend-heavy", "Balanced full-stack", "AI/data-heavy", "Systems/database"];

const SKILL_GROUPS = [
  { label: "Frontend", skills: ["React", "Next.js", "TypeScript", "Tailwind", "Accessibility"] },
  { label: "Backend", skills: ["FastAPI", "Python", "REST APIs", "JWT", "Docker"] },
  { label: "Data", skills: ["PostgreSQL", "SQL", "Database Design", "SQLAlchemy"] },
  { label: "AI/ML", skills: ["Machine Learning", "LLM", "Data Preprocessing", "Model Evaluation"] },
];

const DEFAULT_FORM: BuilderForm = {
  fullName: "",
  university: "",
  degree: "",
  graduationYear: "",
  gpa: "",
  targetRole: "Full Stack Developer",
  experienceLevel: "student",
  careerGoal: "",
  preferredWorkType: "Balanced full-stack",
  skills: ["React", "Next.js", "TypeScript", "FastAPI", "PostgreSQL"],
  projectSummary: "",
  projectContribution: "",
  projectStack: "",
  hardestChallenge: "",
  portfolioUrl: "",
  linkedinUrl: "",
  resumeUrl: "",
};

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function profileDraftFromForm(form: BuilderForm, aiDraft: OnboardingProfileDraft | null): OnboardingProfileDraft {
  return {
    ...aiDraft,
    full_name: textOrNull(form.fullName),
    university: textOrNull(form.university),
    degree: textOrNull(form.degree),
    graduation_year: numberOrNull(form.graduationYear),
    gpa: numberOrNull(form.gpa),
    target_role: textOrNull(form.targetRole),
    experience_level: textOrNull(form.experienceLevel),
    tech_stack: unique([...form.skills, ...splitList(form.projectStack)]),
    skills: unique([...form.skills, ...splitList(form.projectStack)]),
    portfolio_url: textOrNull(form.portfolioUrl),
    linkedin_url: textOrNull(form.linkedinUrl),
    resume_url: textOrNull(form.resumeUrl),
    availability_status: "open",
    project_summary: textOrNull([form.projectSummary, form.projectContribution, form.hardestChallenge].filter(Boolean).join(" ")),
    career_goal: textOrNull(form.careerGoal),
  };
}

function profileUpdateFromForm(
  form: BuilderForm,
  aiDraft: OnboardingProfileDraft | null,
  existingProfile: CandidateProfile | null
): CandidateProfileUpdate {
  const draft = profileDraftFromForm(form, aiDraft);
  const stack = unique([...(draft.tech_stack ?? []), ...(existingProfile?.tech_stack ?? [])]);
  return {
    full_name: draft.full_name ?? existingProfile?.full_name ?? null,
    university: draft.university ?? existingProfile?.university ?? null,
    degree: draft.degree ?? existingProfile?.degree ?? null,
    graduation_year: draft.graduation_year ?? existingProfile?.graduation_year ?? null,
    gpa: draft.gpa ?? existingProfile?.gpa ?? null,
    target_role: draft.target_role ?? existingProfile?.target_role ?? null,
    experience_level: draft.experience_level ?? existingProfile?.experience_level ?? "student",
    tech_stack: stack,
    skills: stack.length ? stack : existingProfile?.skills ?? [],
    portfolio_url: draft.portfolio_url ?? existingProfile?.portfolio_url ?? null,
    linkedin_url: draft.linkedin_url ?? existingProfile?.linkedin_url ?? null,
    resume_url: draft.resume_url ?? existingProfile?.resume_url ?? null,
    profile_visibility: existingProfile?.profile_visibility ?? false,
    availability_status: existingProfile?.availability_status ?? "open",
    profile_complete: true,
  };
}

function localSkillSuggestions(form: BuilderForm): string[] {
  const role = form.targetRole.toLowerCase();
  const selected = new Set(form.skills);
  const suggestions =
    role.includes("full stack")
      ? ["REST APIs", "PostgreSQL", "API Design", "Debugging", "System Design"]
      : role.includes("frontend")
        ? ["Accessibility", "State Management", "Performance", "Next.js"]
        : role.includes("backend")
          ? ["API Design", "Authentication", "PostgreSQL", "Docker"]
          : role.includes("ai")
            ? ["Python", "Machine Learning", "Model Evaluation", "Data Preprocessing"]
            : ["SQL", "Database Design", "Query Optimization", "Data Integrity"];
  return suggestions.filter((item) => !selected.has(item)).slice(0, 4);
}

function assessmentFocus(form: BuilderForm, aiResponse: OnboardingChatResponse | null): string[] {
  const stackText = [...form.skills, form.targetRole].join(" ").toLowerCase();
  const focus = new Set<string>();
  if (stackText.includes("react")) focus.add("React component design");
  if (stackText.includes("next")) focus.add("Next.js routing and data fetching");
  if (stackText.includes("fastapi") || stackText.includes("api")) focus.add("Backend API design");
  if (stackText.includes("postgres") || stackText.includes("sql")) focus.add("PostgreSQL database modeling");
  if (form.targetRole.toLowerCase().includes("full stack")) focus.add("Full-stack integration");
  if (form.targetRole.toLowerCase().includes("ai")) focus.add("Model evaluation and data preprocessing");
  focus.add("Debugging and tradeoff reasoning");
  focus.add("System design / communication");
  for (const skill of aiResponse?.suggested_skills ?? []) {
    if (focus.size >= 7) break;
    focus.add(`${skill} evidence check`);
  }
  return Array.from(focus).slice(0, 7);
}

function missingFields(form: BuilderForm): string[] {
  const missing: string[] = [];
  if (!form.fullName.trim()) missing.push("full name");
  if (!form.university.trim()) missing.push("university");
  if (!form.degree.trim()) missing.push("degree");
  if (!form.graduationYear.trim()) missing.push("graduation year");
  if (!form.targetRole.trim()) missing.push("target role");
  if (form.skills.length < 3) missing.push("3+ skills");
  if (!form.projectSummary.trim()) missing.push("strongest project");
  if (!form.projectContribution.trim()) missing.push("personal contribution");
  return missing;
}

function completionPercent(form: BuilderForm): number {
  const total = 9;
  const complete = [
    form.fullName,
    form.university,
    form.degree,
    form.graduationYear,
    form.targetRole,
    form.experienceLevel,
    form.skills.length >= 3 ? "skills" : "",
    form.projectSummary,
    form.projectContribution,
  ].filter(Boolean).length;
  return Math.round((complete / total) * 100);
}

function mergeAiDraft(
  current: OnboardingProfileDraft | null,
  response: OnboardingChatResponse
): OnboardingProfileDraft {
  return {
    ...current,
    ...response.extracted_fields,
    target_role: response.extracted_fields.target_role ?? response.inferred_target_role ?? current?.target_role,
    experience_level:
      response.extracted_fields.experience_level ?? response.inferred_experience_level ?? current?.experience_level,
    skills: response.extracted_fields.skills?.length
      ? response.extracted_fields.skills
      : response.suggested_skills.length
        ? response.suggested_skills
        : current?.skills,
    tech_stack: response.extracted_fields.tech_stack?.length
      ? response.extracted_fields.tech_stack
      : current?.tech_stack,
  };
}

export default function TalentProfileBuilderPage() {
  const router = useRouter();
  const { completeProfile } = useMarketplaceStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<BuilderForm>(DEFAULT_FORM);
  const [customSkill, setCustomSkill] = useState("");
  const [existingProfile, setExistingProfile] = useState<CandidateProfile | null>(null);
  const [aiResponse, setAiResponse] = useState<OnboardingChatResponse | null>(null);
  const [aiDraft, setAiDraft] = useState<OnboardingProfileDraft | null>(null);
  const [aiState, setAiState] = useState<"idle" | "loading" | "fallback" | "error">("idle");
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  const currentStep = STEPS[stepIndex];
  const completion = completionPercent(form);
  const missing = missingFields(form);
  const focusItems = useMemo(() => assessmentFocus(form, aiResponse), [form, aiResponse]);
  const suggestions = useMemo(() => {
    const aiSuggestions = aiResponse
      ? unique([
          ...(aiResponse.extracted_fields.tech_stack ?? []),
          ...(aiResponse.extracted_fields.skills ?? []),
          ...aiResponse.suggested_skills,
        ]).filter((skill) => !form.skills.includes(skill))
      : [];
    return unique([...aiSuggestions, ...localSkillSuggestions(form)]).slice(0, 6);
  }, [aiResponse, form]);

  useEffect(() => {
    let cancelled = false;
    async function loadExistingProfile() {
      try {
        const profile = await getCandidateProfile();
        if (cancelled) return;
        setExistingProfile(profile);
        setForm((current) => ({
          ...current,
          fullName: profile.full_name ?? current.fullName,
          university: profile.university ?? current.university,
          degree: profile.degree ?? current.degree,
          graduationYear: profile.graduation_year ? String(profile.graduation_year) : current.graduationYear,
          gpa: profile.gpa ? String(profile.gpa) : current.gpa,
          targetRole: profile.target_role ?? current.targetRole,
          experienceLevel: profile.experience_level ?? current.experienceLevel,
          skills: profile.tech_stack?.length ? profile.tech_stack : current.skills,
          portfolioUrl: profile.portfolio_url ?? current.portfolioUrl,
          linkedinUrl: profile.linkedin_url ?? current.linkedinUrl,
          resumeUrl: profile.resume_url ?? current.resumeUrl,
        }));
      } catch (error) {
        if (!isCandidateProfileMissing(error) && !canUseProfileDemoFallback(error)) {
          setProfileError(profileErrorMessage(error));
        }
      }
    }
    loadExistingProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateForm = (patch: Partial<BuilderForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setProfileError(null);
    setProfileNotice(null);
  };

  const toggleSkill = (skill: string) => {
    setForm((current) => ({
      ...current,
      skills: current.skills.includes(skill)
        ? current.skills.filter((item) => item !== skill)
        : unique([...current.skills, skill]),
    }));
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (!trimmed) return;
    setForm((current) => ({ ...current, skills: unique([...current.skills, trimmed]) }));
    setCustomSkill("");
  };

  const runAiAssist = async (intent: "skills" | "project" | "blueprint") => {
    setAiState("loading");
    setAiMessage(null);
    try {
      const draft = profileDraftFromForm(form, aiDraft);
      const userMessage =
        intent === "skills"
          ? `Suggest role-fit skills for ${form.targetRole}. Current stack: ${form.skills.join(", ")}. Career goal: ${form.careerGoal || "not provided"}.`
          : intent === "project"
            ? `Improve and extract evidence from this project. Summary: ${form.projectSummary}. Contribution: ${form.projectContribution}. Challenge: ${form.hardestChallenge}. Stack: ${form.projectStack}.`
            : `Generate an assessment blueprint for role ${form.targetRole} with stack ${form.skills.join(", ")} and project evidence ${form.projectSummary}.`;
      const response = await sendOnboardingChatMessage({
        current_profile: draft,
        user_message: userMessage,
        conversation_history: [],
        current_step: intent,
      });
      setAiResponse(response);
      setAiDraft(mergeAiDraft(aiDraft, response));
      setAiState(response.provider_metadata.fallback_used ? "fallback" : "idle");
      setAiMessage(response.assistant_message);
    } catch (error) {
      if (canUseOnboardingAIDemoFallback(error)) {
        setAiState("fallback");
        setAiMessage("AI is in demo fallback. I generated local guidance from your selected role and stack.");
        return;
      }
      setAiState("error");
      setAiMessage(onboardingAIErrorMessage(error));
    }
  };

  const applyAISuggestions = () => {
    if (!aiResponse) return;
    const nextSkills = unique([
      ...form.skills,
      ...(aiResponse.extracted_fields.tech_stack ?? []),
      ...(aiResponse.extracted_fields.skills ?? []),
      ...aiResponse.suggested_skills,
    ]);
    updateForm({
      targetRole: aiResponse.inferred_target_role ?? aiResponse.extracted_fields.target_role ?? form.targetRole,
      experienceLevel:
        aiResponse.inferred_experience_level ?? aiResponse.extracted_fields.experience_level ?? form.experienceLevel,
      skills: nextSkills,
      projectSummary: aiResponse.extracted_fields.project_summary ?? form.projectSummary,
      careerGoal: aiResponse.extracted_fields.career_goal ?? form.careerGoal,
    });
    setProfileNotice("AI suggestions applied. Review the profile preview before saving.");
  };

  const goNext = () => {
    if (currentStep.id === "skills") void runAiAssist("skills");
    if (currentStep.id === "projects") void runAiAssist("project");
    if (stepIndex < STEPS.length - 1) setStepIndex((value) => value + 1);
  };

  const goBack = () => {
    if (stepIndex > 0) setStepIndex((value) => value - 1);
  };

  const completeLocalProfile = async (notice: string, destination: string) => {
    completeProfile();
    setProfileNotice(notice);
    await new Promise((resolve) => setTimeout(resolve, 500));
    router.push(destination);
  };

  const handleSaveProfile = async (destination = "/dashboard/student") => {
    if (isSavingProfile) return;
    if (!form.fullName.trim() || !form.targetRole.trim() || form.skills.length < 1) {
      setProfileError("Add your name, target role, and at least one skill before saving.");
      return;
    }
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileNotice(null);

    try {
      let profile = existingProfile;
      if (!profile) {
        try {
          profile = await getCandidateProfile();
          setExistingProfile(profile);
        } catch (error) {
          if (isCandidateProfileMissing(error)) {
            profile = null;
          } else if (canUseProfileDemoFallback(error)) {
            await completeLocalProfile("Backend unavailable. Continuing with local demo profile.", destination);
            return;
          } else {
            setProfileError(profileErrorMessage(error));
            return;
          }
        }
      }

      await updateCandidateProfile(profileUpdateFromForm(form, aiDraft, profile));
      completeProfile();
      setProfileNotice("Profile saved. Opening your next step...");
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push(destination);
    } catch (error) {
      if (canUseProfileDemoFallback(error)) {
        await completeLocalProfile("Backend unavailable. Continuing with local demo profile.", destination);
      } else {
        setProfileError(profileErrorMessage(error));
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] antialiased">
      <MeshBackground />
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/85 px-4 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-3">
          <div>
            <BrandLogo imageClassName="h-9" />
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              Talent Profile Builder
            </div>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="relative z-10 min-h-0 flex-1 p-3 md:p-5">
        <div className="mx-auto grid h-full max-w-[1240px] gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
            <div className="shrink-0 border-b border-[var(--color-border)] p-4 md:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[var(--color-accent)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI-assisted profile setup
                  </div>
                  <h1 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">Build your verified talent profile</h1>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Profile completion
                  </div>
                  <div className="text-2xl font-bold text-[var(--color-accent)]">{completion}%</div>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-5">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const active = index === stepIndex;
                  const complete = index < stepIndex;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setStepIndex(index)}
                      className={cn(
                        "flex items-center gap-2 rounded-[12px] border px-3 py-2 text-left text-[12px] font-bold transition-all",
                        active
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                          : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                      )}
                    >
                      {complete ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Icon className="h-4 w-4" />}
                      {step.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
              <motion.div key={currentStep.id} variants={fadeUp} initial="hidden" animate="visible">
                {currentStep.id === "identity" && (
                  <StepCard
                    icon={GraduationCap}
                    title="Basic identity"
                    description="These are normal profile fields. No AI needed."
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Full name" value={form.fullName} onChange={(value) => updateForm({ fullName: value })} placeholder="e.g. Anas Malik" />
                      <Field label="University" value={form.university} onChange={(value) => updateForm({ university: value })} placeholder="e.g. FAST NUCES" />
                      <Field label="Degree" value={form.degree} onChange={(value) => updateForm({ degree: value })} placeholder="e.g. BS Computer Science" />
                      <Field label="Graduation year" value={form.graduationYear} onChange={(value) => updateForm({ graduationYear: value })} placeholder="2026" type="number" />
                      <Field label="GPA" value={form.gpa} onChange={(value) => updateForm({ gpa: value })} placeholder="3.5" type="number" />
                    </div>
                  </StepCard>
                )}

                {currentStep.id === "role" && (
                  <StepCard
                    icon={Briefcase}
                    title="Target role"
                    description="Choose the role family your assessment should calibrate around."
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      {ROLE_CARDS.map((item) => (
                        <button
                          key={item.role}
                          type="button"
                          onClick={() => updateForm({ targetRole: item.role })}
                          className={cn(
                            "rounded-[16px] border p-4 text-left transition-all",
                            form.targetRole === item.role
                              ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                              : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-subtle)]"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-bold text-[var(--color-text-primary)]">{item.role}</div>
                            {form.targetRole === item.role && <Check className="h-4 w-4 text-[var(--color-accent)]" />}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{item.focus}</p>
                        </button>
                      ))}
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <SelectField label="Experience level" value={form.experienceLevel} values={EXPERIENCE_LEVELS} onChange={(value) => updateForm({ experienceLevel: value })} />
                      <SelectField label="Preferred work type" value={form.preferredWorkType} values={WORK_TYPES} onChange={(value) => updateForm({ preferredWorkType: value })} />
                      <div className="md:col-span-2">
                        <TextArea label="Career goal" value={form.careerGoal} onChange={(value) => updateForm({ careerGoal: value })} placeholder="What kind of role, internship, or company should this profile help you reach?" rows={3} />
                      </div>
                    </div>
                  </StepCard>
                )}

                {currentStep.id === "skills" && (
                  <StepCard
                    icon={Code2}
                    title="Skills and tech stack"
                    description="Select what you have used hands-on. AI can suggest missing role-fit signals."
                    action={
                      <button type="button" onClick={() => void runAiAssist("skills")} className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] px-3 py-2 text-[12px] font-bold text-[var(--color-accent)]">
                        {aiState === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        Improve with AI
                      </button>
                    }
                  >
                    <div className="space-y-5">
                      {SKILL_GROUPS.map((group) => (
                        <div key={group.label}>
                          <div className="mb-2 text-[12px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{group.label}</div>
                          <div className="flex flex-wrap gap-2">
                            {group.skills.map((skill) => (
                              <SkillChip key={skill} label={skill} active={form.skills.includes(skill)} onClick={() => toggleSkill(skill)} />
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          value={customSkill}
                          onChange={(event) => setCustomSkill(event.target.value)}
                          onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addCustomSkill())}
                          placeholder="Add custom skill"
                          className="min-w-0 flex-1 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
                        />
                        <button type="button" onClick={addCustomSkill} className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--color-accent)] px-4 py-2.5 text-sm font-bold text-[var(--color-text-inverse)]">
                          <Plus className="h-4 w-4" />
                          Add
                        </button>
                      </div>
                    </div>
                  </StepCard>
                )}

                {currentStep.id === "projects" && (
                  <StepCard
                    icon={FolderOpen}
                    title="Projects and evidence"
                    description="Give the assessment useful context without making the profile feel like a chat transcript."
                    action={
                      <button type="button" onClick={() => void runAiAssist("project")} className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] px-3 py-2 text-[12px] font-bold text-[var(--color-accent)]">
                        {aiState === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        Improve with AI
                      </button>
                    }
                  >
                    <div className="grid gap-4">
                      <TextArea label="Strongest technical project" value={form.projectSummary} onChange={(value) => updateForm({ projectSummary: value })} placeholder="What did you build, who used it, and why was it technically meaningful?" rows={3} />
                      <TextArea label="What you personally built" value={form.projectContribution} onChange={(value) => updateForm({ projectContribution: value })} placeholder="Mention specific components, APIs, database work, integrations, or debugging you handled." rows={3} />
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Project stack" value={form.projectStack} onChange={(value) => updateForm({ projectStack: value })} placeholder="React, FastAPI, PostgreSQL" />
                        <Field label="Portfolio link" value={form.portfolioUrl} onChange={(value) => updateForm({ portfolioUrl: value })} placeholder="https://..." />
                      </div>
                      <TextArea label="Hardest technical challenge" value={form.hardestChallenge} onChange={(value) => updateForm({ hardestChallenge: value })} placeholder="What broke, what tradeoff did you make, or what design decision mattered?" rows={2} />
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="LinkedIn" value={form.linkedinUrl} onChange={(value) => updateForm({ linkedinUrl: value })} placeholder="https://linkedin.com/in/..." />
                        <Field label="Resume URL" value={form.resumeUrl} onChange={(value) => updateForm({ resumeUrl: value })} placeholder="https://..." />
                      </div>
                    </div>
                  </StepCard>
                )}

                {currentStep.id === "blueprint" && (
                  <StepCard
                    icon={Brain}
                    title="AI assessment blueprint"
                    description="This is how your profile will guide the RAG-backed assessment."
                    action={
                      <button type="button" onClick={() => void runAiAssist("blueprint")} className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] px-3 py-2 text-[12px] font-bold text-[var(--color-accent)]">
                        {aiState === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        Generate Blueprint
                      </button>
                    }
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      {focusItems.map((item) => (
                        <div key={item} className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                          <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" />
                            <div>
                              <div className="font-bold text-[var(--color-text-primary)]">{item}</div>
                              <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                                Retrieved questions and rubrics should prioritize evidence from your selected role, stack, and project.
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </StepCard>
                )}
              </motion.div>
            </div>

            <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-card)] p-4 md:p-5">
              {(profileError || profileNotice) && (
                <div
                  role={profileError ? "alert" : undefined}
                  className={cn(
                    "mb-3 rounded-[12px] border px-4 py-3 text-[13px] font-semibold",
                    profileError
                      ? "border-red-500/30 bg-red-500/10 text-red-500"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  )}
                >
                  {profileError ?? profileNotice}
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={stepIndex === 0 || isSavingProfile}
                  className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--color-border)] px-4 py-3 text-sm font-bold text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                {currentStep.id === "blueprint" ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveProfile("/dashboard/student")}
                      disabled={isSavingProfile}
                      className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--color-border)] px-4 py-3 text-sm font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Save Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveProfile("/dashboard/student/interview/prep")}
                      disabled={isSavingProfile}
                      className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      Save & Start Assessment
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)]"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </section>

          <aside className="hidden min-h-0 flex-col overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm lg:flex">
            <div className="border-b border-[var(--color-border)] p-5">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[var(--color-accent)]" />
                <h2 className="text-lg font-bold">Live Talent Preview</h2>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
                <div className="h-full rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${completion}%` }} />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <PreviewBlock label="Target Role" value={form.targetRole || "Not selected"} />
              <PreviewBlock label="Experience" value={form.experienceLevel || "Not set"} />
              <div className="mb-5">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Tech Stack</div>
                <div className="flex flex-wrap gap-2">
                  {form.skills.length ? form.skills.slice(0, 10).map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1 text-[12px] font-semibold text-[var(--color-text-secondary)]">
                      {skill}
                      <button type="button" onClick={() => toggleSkill(skill)} aria-label={`Remove ${skill}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )) : <span className="text-sm text-[var(--color-text-muted)]">No skills selected</span>}
                </div>
              </div>
              <div className="mb-5">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Assessment Focus</div>
                <ul className="space-y-2">
                  {focusItems.slice(0, 5).map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-[var(--color-text-secondary)]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mb-5 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Missing Fields</div>
                {missing.length ? (
                  <div className="flex flex-wrap gap-2">
                    {missing.slice(0, 6).map((field) => (
                      <span key={field} className="rounded-full bg-[var(--color-warning-light)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-warning)]">
                        {field}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-emerald-500">Profile is ready to save.</p>
                )}
              </div>
              <AICopilotCard
                aiState={aiState}
                aiMessage={aiMessage}
                aiResponse={aiResponse}
                suggestions={suggestions}
                onApply={applyAISuggestions}
                onAddSkill={toggleSkill}
              />
              <RagDebugPanel
                title="Onboarding AI"
                summary="Provider and retrieved onboarding context returned by the backend."
                className="mt-4"
                metadata={{
                  provider_metadata: aiResponse?.provider_metadata,
                  retrieved_context_metadata: aiResponse?.retrieved_context_metadata,
                  fallback_notice: aiState === "fallback" ? aiMessage : null,
                }}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function StepCard({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: typeof GraduationCap;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 md:p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-accent-light)] text-[var(--color-accent)]">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-violet-500/10"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-3 text-sm leading-6 text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-violet-500/10"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-violet-500/10"
      >
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function SkillChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-[13px] font-bold transition-all",
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
      )}
    >
      {label}
    </button>
  );
}

function PreviewBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 text-base font-bold text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}

function AICopilotCard({
  aiState,
  aiMessage,
  aiResponse,
  suggestions,
  onApply,
  onAddSkill,
}: {
  aiState: "idle" | "loading" | "fallback" | "error";
  aiMessage: string | null;
  aiResponse: OnboardingChatResponse | null;
  suggestions: string[];
  onApply: () => void;
  onAddSkill: (skill: string) => void;
}) {
  return (
    <div className="rounded-[16px] border border-violet-500/20 bg-violet-500/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
          <div className="text-sm font-bold text-[var(--color-text-primary)]">AI copilot</div>
        </div>
        {aiResponse && (
          <span className="rounded-full bg-[var(--color-bg-primary)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-text-muted)]">
            {providerLabel(aiResponse.provider_metadata)}
            {aiResponse.provider_metadata.fallback_used ? " fallback" : ""}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
        {aiState === "loading"
          ? "AI analyzing your role, stack, and evidence..."
          : aiMessage || "Select your role and skills, then use AI to refine suggestions or generate your assessment blueprint."}
      </p>
      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => onAddSkill(skill)}
              className="rounded-full border border-violet-500/20 bg-[var(--color-bg-primary)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-accent)]"
            >
              + {skill}
            </button>
          ))}
        </div>
      )}
      {aiResponse && (
        <button
          type="button"
          onClick={onApply}
          className="mt-3 inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-3 py-2 text-[12px] font-bold text-[var(--color-text-inverse)]"
        >
          <Check className="h-3.5 w-3.5" />
          Apply AI suggestions
        </button>
      )}
      {aiState === "error" && <p className="mt-2 text-xs font-semibold text-red-500">{aiMessage}</p>}
    </div>
  );
}
