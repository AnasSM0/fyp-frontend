"use client";

import { create } from "zustand";
import { getCandidateById, PRIMARY_STUDENT_ID } from "@/lib/mock-marketplace";

export type UserRole = "candidate" | "recruiter";
export type InviteStatus = "pending" | "accepted" | "declined";
export type AvailabilityStatus = "open" | "interviewing" | "paused";
export type ActivityType =
  | "profile_view"
  | "semantic_match"
  | "invite_sent"
  | "invite_accepted"
  | "invite_declined"
  | "profile_published"
  | "assessment_completed"
  | "report_reviewed"
  | "shortlisted";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  createdAt: string;
  actor?: string;
}

export interface InterviewInvite {
  id: string;
  candidateId: string;
  candidateName: string;
  company: string;
  role: string;
  location: string;
  message: string;
  salaryRange: string;
  interviewWindow: string;
  opportunityType: string;
  note: string;
  createdAt: string;
  status: InviteStatus;
}

interface PersistedMarketplaceState {
  currentRole: UserRole;
  profileComplete: boolean;
  assessmentComplete: boolean;
  reportReviewed: boolean;
  profilePublished: boolean;
  availabilityStatus: AvailabilityStatus;
  visibilityScore: number;
  recruiterViews: number;
  activityEvents: ActivityEvent[];
  lastSearchQuery: string;
  savedCandidateIds: string[];
  invites: InterviewInvite[];
}

interface MarketplaceState extends PersistedMarketplaceState {
  hydrateMarketplaceState: () => void;
  setRole: (role: UserRole) => void;
  completeProfile: () => void;
  completeAssessment: () => void;
  markReportReviewed: () => void;
  publishProfile: () => void;
  setAvailabilityStatus: (status: AvailabilityStatus) => void;
  setLastSearchQuery: (query: string) => void;
  addActivity: (event: Omit<ActivityEvent, "id" | "createdAt"> & { createdAt?: string }) => void;
  toggleSavedCandidate: (candidateId: string) => void;
  sendInvite: (invite: Omit<InterviewInvite, "id" | "createdAt" | "status">) => string;
  respondToInvite: (inviteId: string, status: Exclude<InviteStatus, "pending">) => void;
  resetDemoMarketplace: () => void;
}

const STORAGE_KEY = "xlr8_marketplace_state";

const seedInvites: InterviewInvite[] = [
  {
    id: "INV-001",
    candidateId: PRIMARY_STUDENT_ID,
    candidateName: "Alex Chen",
    company: "Acme Corp",
    role: "Frontend Engineer Intern",
    location: "Remote",
    message:
      "Your React architecture assessment stood out. We would like to invite you to a technical screen.",
    salaryRange: "$70k - $95k",
    interviewWindow: "Tomorrow, 10:00 AM",
    opportunityType: "Interview request",
    note: "Strong match on React and system design vectors.",
    createdAt: "2d ago",
    status: "pending",
  },
  {
    id: "INV-002",
    candidateId: PRIMARY_STUDENT_ID,
    candidateName: "Alex Chen",
    company: "TechFlow Inc",
    role: "Full Stack Developer",
    location: "New York (Hybrid)",
    message:
      "Strong match for our platform team. We are especially interested in your system design score.",
    salaryRange: "$85k - $120k",
    interviewWindow: "Oct 24, 2:30 PM",
    opportunityType: "Interview request",
    note: "Candidate ranked in the top 5% for full-stack readiness.",
    createdAt: "4d ago",
    status: "pending",
  },
];

const seedActivityEvents: ActivityEvent[] = [
  {
    id: "ACT-001",
    type: "profile_view",
    title: "Series B fintech viewed your profile",
    detail: "Recruiter inspected your verified React and system design signals.",
    actor: "Northstar Fintech",
    createdAt: "14m ago",
  },
  {
    id: "ACT-002",
    type: "semantic_match",
    title: "Matched 94% on a distributed systems search",
    detail: "Your profile appeared in a recruiter query for senior full-stack talent.",
    actor: "XLR8 AI",
    createdAt: "2h ago",
  },
  {
    id: "ACT-003",
    type: "profile_view",
    title: "TechFlow pinned your system design score",
    detail: "The recruiter saved your assessment evidence for interview review.",
    actor: "TechFlow Inc",
    createdAt: "5h ago",
  },
];

const defaultState: PersistedMarketplaceState = {
  currentRole: "candidate",
  profileComplete: false,
  assessmentComplete: false,
  reportReviewed: false,
  profilePublished: false,
  availabilityStatus: "open",
  visibilityScore: 78,
  recruiterViews: 18,
  activityEvents: seedActivityEvents,
  lastSearchQuery: "",
  savedCandidateIds: [],
  invites: seedInvites,
};

function createActivity(
  event: Omit<ActivityEvent, "id" | "createdAt"> & { createdAt?: string }
): ActivityEvent {
  return {
    ...event,
    id: `ACT-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    createdAt: event.createdAt ?? "Just now",
  };
}

function normalizeRole(value: unknown): UserRole {
  return value === "recruiter" ? "recruiter" : "candidate";
}

function normalizeAvailability(value: unknown): AvailabilityStatus {
  if (value === "interviewing" || value === "paused") return value;
  return "open";
}

function normalizeInvite(raw: Partial<InterviewInvite>, index: number): InterviewInvite {
  const candidate = getCandidateById(raw.candidateId ?? PRIMARY_STUDENT_ID);
  const status: InviteStatus =
    raw.status === "accepted" || raw.status === "declined" ? raw.status : "pending";

  return {
    id: typeof raw.id === "string" ? raw.id : `INV-SEED-${index}`,
    candidateId: typeof raw.candidateId === "string" ? raw.candidateId : candidate.id,
    candidateName: typeof raw.candidateName === "string" ? raw.candidateName : candidate.name,
    company: typeof raw.company === "string" ? raw.company : "Acme Corp",
    role: typeof raw.role === "string" ? raw.role : candidate.role,
    location: typeof raw.location === "string" ? raw.location : candidate.location,
    message:
      typeof raw.message === "string"
        ? raw.message
        : "Your verified profile matches our team. We would like to request an interview.",
    salaryRange:
      typeof raw.salaryRange === "string" ? raw.salaryRange : candidate.salaryRange,
    interviewWindow:
      typeof raw.interviewWindow === "string" ? raw.interviewWindow : "This week",
    opportunityType:
      typeof raw.opportunityType === "string" ? raw.opportunityType : "Interview request",
    note: typeof raw.note === "string" ? raw.note : "Sent from recruiter discovery.",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "Just now",
    status,
  };
}

function normalizeActivity(raw: Partial<ActivityEvent>, index: number): ActivityEvent {
  const type: ActivityType =
    raw.type === "profile_view" ||
    raw.type === "semantic_match" ||
    raw.type === "invite_sent" ||
    raw.type === "invite_accepted" ||
    raw.type === "invite_declined" ||
    raw.type === "profile_published" ||
    raw.type === "assessment_completed" ||
    raw.type === "report_reviewed" ||
    raw.type === "shortlisted"
      ? raw.type
      : "semantic_match";

  return {
    id: typeof raw.id === "string" ? raw.id : `ACT-SEED-${index}`,
    type,
    title: typeof raw.title === "string" ? raw.title : "Marketplace activity",
    detail:
      typeof raw.detail === "string"
        ? raw.detail
        : "A marketplace signal was recorded for the demo.",
    actor: typeof raw.actor === "string" ? raw.actor : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "Just now",
  };
}

function normalizeState(raw: Partial<PersistedMarketplaceState>): PersistedMarketplaceState {
  return {
    currentRole: normalizeRole(raw.currentRole),
    profileComplete: Boolean(raw.profileComplete),
    assessmentComplete: Boolean(raw.assessmentComplete),
    reportReviewed: Boolean(raw.reportReviewed),
    profilePublished: Boolean(raw.profilePublished),
    availabilityStatus: normalizeAvailability(raw.availabilityStatus),
    visibilityScore:
      typeof raw.visibilityScore === "number" ? raw.visibilityScore : defaultState.visibilityScore,
    recruiterViews:
      typeof raw.recruiterViews === "number" ? raw.recruiterViews : defaultState.recruiterViews,
    activityEvents: Array.isArray(raw.activityEvents)
      ? raw.activityEvents.map(normalizeActivity)
      : defaultState.activityEvents,
    lastSearchQuery: typeof raw.lastSearchQuery === "string" ? raw.lastSearchQuery : "",
    savedCandidateIds: Array.isArray(raw.savedCandidateIds)
      ? raw.savedCandidateIds.filter((id): id is string => typeof id === "string")
      : [],
    invites: Array.isArray(raw.invites)
      ? raw.invites.map(normalizeInvite)
      : defaultState.invites,
  };
}

function readSavedState(): PersistedMarketplaceState {
  if (typeof window === "undefined") return defaultState;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultState;
    return normalizeState(JSON.parse(saved));
  } catch {
    return defaultState;
  }
}

function loadInitialState(): PersistedMarketplaceState {
  return defaultState;
}

function persist(state: PersistedMarketplaceState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function snapshot(state: MarketplaceState): PersistedMarketplaceState {
  return {
    currentRole: state.currentRole,
    profileComplete: state.profileComplete,
    assessmentComplete: state.assessmentComplete,
    reportReviewed: state.reportReviewed,
    profilePublished: state.profilePublished,
    availabilityStatus: state.availabilityStatus,
    visibilityScore: state.visibilityScore,
    recruiterViews: state.recruiterViews,
    activityEvents: state.activityEvents,
    lastSearchQuery: state.lastSearchQuery,
    savedCandidateIds: state.savedCandidateIds,
    invites: state.invites,
  };
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  ...loadInitialState(),
  hydrateMarketplaceState: () => {
    set(readSavedState());
  },
  setRole: (role) => {
    set({ currentRole: role });
    persist(snapshot(get()));
  },
  completeProfile: () => {
    set((state) => ({
      profileComplete: true,
      activityEvents: state.profileComplete
        ? state.activityEvents
        : [
            createActivity({
              type: "semantic_match",
              title: "Candidate profile completed",
              detail: "Your profile is ready for assessment calibration.",
              actor: "XLR8 AI",
            }),
            ...state.activityEvents,
          ].slice(0, 30),
    }));
    persist(snapshot(get()));
  },
  completeAssessment: () => {
    set((state) => ({
      assessmentComplete: true,
      activityEvents: state.assessmentComplete
        ? state.activityEvents
        : [
            createActivity({
              type: "assessment_completed",
              title: "AI assessment completed",
              detail: "Verified technical evidence is ready for your report.",
              actor: "XLR8 AI",
            }),
            ...state.activityEvents,
          ].slice(0, 30),
    }));
    persist(snapshot(get()));
  },
  markReportReviewed: () => {
    set((state) => ({
      reportReviewed: true,
      activityEvents: state.reportReviewed
        ? state.activityEvents
        : [
            createActivity({
              type: "report_reviewed",
              title: "Verified report reviewed",
              detail: "Your AI score and recruiter-facing evidence are ready to publish.",
              actor: "XLR8 AI",
            }),
            ...state.activityEvents,
          ].slice(0, 30),
    }));
    persist(snapshot(get()));
  },
  publishProfile: () => {
    set((state) => ({
      profilePublished: true,
      visibilityScore: Math.max(state.visibilityScore, 92),
      recruiterViews: Math.max(state.recruiterViews, 24),
      activityEvents: state.profilePublished
        ? state.activityEvents
        : [
            createActivity({
              type: "profile_published",
              title: "Verified profile published",
              detail: "Recruiters can now discover and request interviews with you.",
              actor: "XLR8 Marketplace",
            }),
            ...state.activityEvents,
          ].slice(0, 30),
    }));
    persist(snapshot(get()));
  },
  setAvailabilityStatus: (availabilityStatus) => {
    set({ availabilityStatus });
    persist(snapshot(get()));
  },
  setLastSearchQuery: (lastSearchQuery) => {
    set({ lastSearchQuery });
    persist(snapshot(get()));
  },
  addActivity: (event) => {
    set((state) => ({
      activityEvents: [createActivity(event), ...state.activityEvents].slice(0, 30),
    }));
    persist(snapshot(get()));
  },
  toggleSavedCandidate: (candidateId) => {
    const candidate = getCandidateById(candidateId);
    const savedCandidateIds = get().savedCandidateIds.includes(candidateId)
      ? get().savedCandidateIds.filter((id) => id !== candidateId)
      : [...get().savedCandidateIds, candidateId];

    set((state) => ({
      savedCandidateIds,
      activityEvents: savedCandidateIds.includes(candidateId)
        ? [
            createActivity({
              type: "shortlisted",
              title: `${candidate.name} added to shortlist`,
              detail: "Recruiter saved this verified profile for follow-up.",
              actor: "Acme Corp",
            }),
            ...state.activityEvents,
          ].slice(0, 30)
        : state.activityEvents,
    }));
    persist(snapshot(get()));
  },
  sendInvite: (invite) => {
    const id = `INV-${Date.now()}`;
    const nextInvite: InterviewInvite = {
      ...invite,
      id,
      createdAt: "Just now",
      status: "pending",
    };

    set((state) => ({
      invites: [nextInvite, ...state.invites],
      activityEvents: [
        createActivity({
          type: "invite_sent",
          title: `${nextInvite.company} requested ${nextInvite.candidateName}`,
          detail: `${nextInvite.role} invitation sent with ${nextInvite.salaryRange} range.`,
          actor: nextInvite.company,
        }),
        ...state.activityEvents,
      ].slice(0, 30),
    }));
    persist(snapshot(get()));
    return id;
  },
  respondToInvite: (inviteId, status) => {
    const invite = get().invites.find((item) => item.id === inviteId);
    set((state) => ({
      invites: state.invites.map((item) =>
        item.id === inviteId ? { ...item, status } : item
      ),
      activityEvents: invite
        ? [
            createActivity({
              type: status === "accepted" ? "invite_accepted" : "invite_declined",
              title: `${invite.candidateName} ${status} ${invite.company}'s request`,
              detail:
                status === "accepted"
                  ? "The recruiter can now proceed with the interview."
                  : "The opportunity was declined by the candidate.",
              actor: invite.candidateName,
            }),
            ...state.activityEvents,
          ].slice(0, 30)
        : state.activityEvents,
    }));
    persist(snapshot(get()));
  },
  resetDemoMarketplace: () => {
    set(defaultState);
    persist(defaultState);
  },
}));
