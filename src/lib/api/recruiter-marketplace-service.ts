import { apiDelete, apiGet, apiPost } from "./client";
import { ApiError } from "./errors";
import {
  CandidateRequestListResponse,
  RecruiterCandidateProfile,
  RecruiterCandidateSearchItem,
  RecruiterCandidateSearchResponse,
  RecruiterDashboardSummary,
  RecruiterInviteCreate,
  RecruiterInviteItem,
  RecruiterInviteListResponse,
} from "./types";

export interface RecruiterSearchParams {
  q?: string;
  role?: string;
  skills?: string[];
  minScore?: number;
  availability?: string;
  sort?: "match" | "score" | "recent";
  page?: number;
  pageSize?: number;
}

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

export function getRecruiterDashboardSummary() {
  return apiGet<RecruiterDashboardSummary>("/api/v1/recruiter/dashboard/summary");
}

export function searchRecruiterCandidates(params: RecruiterSearchParams) {
  return apiGet<RecruiterCandidateSearchResponse>(
    `/api/v1/recruiter/candidates/search${queryString({
      q: params.q,
      role: params.role,
      skills: params.skills?.join(","),
      min_score: params.minScore,
      availability: params.availability,
      sort: params.sort ?? "match",
      page: params.page ?? 1,
      page_size: params.pageSize ?? 10,
    })}`
  );
}

export function getRecruiterCandidate(candidateId: string) {
  return apiGet<RecruiterCandidateProfile>(`/api/v1/recruiter/candidates/${candidateId}`);
}

export function shortlistRecruiterCandidate(candidateId: string) {
  return apiPost<RecruiterCandidateSearchItem>(`/api/v1/recruiter/shortlist/${candidateId}`);
}

export function removeRecruiterShortlist(candidateId: string) {
  return apiDelete<void>(`/api/v1/recruiter/shortlist/${candidateId}`);
}

export function getRecruiterShortlist() {
  return apiGet<RecruiterCandidateSearchResponse>("/api/v1/recruiter/shortlist");
}

export function createRecruiterInvite(payload: RecruiterInviteCreate) {
  return apiPost<RecruiterInviteItem>("/api/v1/recruiter/invites", payload);
}

export function getRecruiterInvites() {
  return apiGet<RecruiterInviteListResponse>("/api/v1/recruiter/invites");
}

export function getCandidateRequests() {
  return apiGet<CandidateRequestListResponse>("/api/v1/candidate/requests");
}

export function recruiterMarketplaceErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sign in again to use recruiter marketplace features.";
    if (error.status === 403) return "This feature is only available for the correct account role.";
    if (error.status === 404) return "This candidate is not published or no longer available.";
    if (error.status === 409) return error.message || "This action conflicts with existing marketplace state.";
    if (error.status === 422) return "Check the request fields and try again.";
    if (error.status && error.status >= 500) return "Recruiter marketplace service is temporarily unavailable.";
    return error.message || "Recruiter marketplace request failed.";
  }
  return "Recruiter marketplace request failed.";
}
