"use client";

import { create } from "zustand";

export type UserRole = "candidate" | "recruiter";
export type InviteStatus = "pending" | "accepted" | "declined";

export interface InterviewInvite {
  id: string;
  candidateName: string;
  company: string;
  role: string;
  location: string;
  message: string;
  salaryRange: string;
  interviewWindow: string;
  createdAt: string;
  status: InviteStatus;
}

interface MarketplaceState {
  currentRole: UserRole;
  profilePublished: boolean;
  savedCandidateIds: string[];
  invites: InterviewInvite[];
  setRole: (role: UserRole) => void;
  publishProfile: () => void;
  toggleSavedCandidate: (candidateId: string) => void;
  sendInvite: (invite: Omit<InterviewInvite, "id" | "createdAt" | "status">) => string;
  respondToInvite: (inviteId: string, status: Exclude<InviteStatus, "pending">) => void;
  resetDemoMarketplace: () => void;
}

const STORAGE_KEY = "xlr8_marketplace_state";

const seedInvites: InterviewInvite[] = [
  {
    id: "INV-001",
    candidateName: "Alex Chen",
    company: "Acme Corp",
    role: "Senior Frontend Engineer",
    location: "Remote",
    message: "Your React architecture assessment stood out. We would like to invite you to a technical screen.",
    salaryRange: "$120k - $150k",
    interviewWindow: "Tomorrow, 10:00 AM",
    createdAt: "2d ago",
    status: "pending",
  },
  {
    id: "INV-002",
    candidateName: "Alex Chen",
    company: "TechFlow Inc",
    role: "Fullstack Developer",
    location: "New York (Hybrid)",
    message: "Strong match for our platform team. We are especially interested in your system design score.",
    salaryRange: "$110k - $135k",
    interviewWindow: "Oct 24, 2:30 PM",
    createdAt: "4d ago",
    status: "pending",
  },
];

const defaultState = {
  currentRole: "candidate" as UserRole,
  profilePublished: false,
  savedCandidateIds: [] as string[],
  invites: seedInvites,
};

function loadInitialState() {
  if (typeof window === "undefined") return defaultState;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultState;
    return { ...defaultState, ...JSON.parse(saved) };
  } catch {
    return defaultState;
  }
}

function persist(state: Pick<MarketplaceState, "currentRole" | "profilePublished" | "savedCandidateIds" | "invites">) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      currentRole: state.currentRole,
      profilePublished: state.profilePublished,
      savedCandidateIds: state.savedCandidateIds,
      invites: state.invites,
    })
  );
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  ...loadInitialState(),
  setRole: (role) => {
    set({ currentRole: role });
    persist(get());
  },
  publishProfile: () => {
    set({ profilePublished: true });
    persist(get());
  },
  toggleSavedCandidate: (candidateId) => {
    const savedCandidateIds = get().savedCandidateIds.includes(candidateId)
      ? get().savedCandidateIds.filter((id) => id !== candidateId)
      : [...get().savedCandidateIds, candidateId];
    set({ savedCandidateIds });
    persist(get());
  },
  sendInvite: (invite) => {
    const id = `INV-${Date.now()}`;
    const nextInvite: InterviewInvite = {
      ...invite,
      id,
      createdAt: "Just now",
      status: "pending",
    };
    set({ invites: [nextInvite, ...get().invites] });
    persist(get());
    return id;
  },
  respondToInvite: (inviteId, status) => {
    set({
      invites: get().invites.map((invite) =>
        invite.id === inviteId ? { ...invite, status } : invite
      ),
    });
    persist(get());
  },
  resetDemoMarketplace: () => {
    set(defaultState);
    persist(get());
  },
}));
