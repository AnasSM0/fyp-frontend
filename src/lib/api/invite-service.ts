import { apiGet, apiPatch } from "./client";
import { ApiError } from "./errors";
import { canUseDemoFallbackForError } from "./fallback";
import {
  CandidateInvite,
  CandidateInviteListResponse,
  InviteRespondRequest,
} from "./types";

export async function getCandidateInvites(): Promise<CandidateInviteListResponse> {
  return apiGet<CandidateInviteListResponse>("/invites/candidate");
}

export async function getCandidateInvite(inviteId: string): Promise<CandidateInvite> {
  return apiGet<CandidateInvite>(`/invites/candidate/${inviteId}`);
}

export async function respondToCandidateInvite(
  inviteId: string,
  payload: InviteRespondRequest
): Promise<CandidateInvite> {
  return apiPatch<CandidateInvite>(`/invites/${inviteId}/respond`, payload);
}

export function canUseCandidateInvitesDemoFallback(error: unknown): boolean {
  return canUseDemoFallbackForError(error);
}

export function candidateInviteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sign in again to view recruiter requests.";
    if (error.status === 403) return "Recruiter requests are only available for candidate accounts.";
    if (error.status === 404) return "Recruiter request not found.";
    if (error.status === 409) return error.message || "This request can no longer be changed.";
    if (error.status === 422) return "Check your response and try again.";
    if (error.status && error.status >= 500) return "Recruiter request service is temporarily unavailable.";
    return error.message || "Recruiter request failed.";
  }
  return "Recruiter request failed.";
}
