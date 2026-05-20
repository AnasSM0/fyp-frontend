import { apiGet, apiPut } from "./client";
import { ApiError } from "./errors";
import { clearApiSession } from "./auth";
import { isDemoFallbackEnabled } from "./fallback";
import { CandidateProfile, CandidateProfileUpdate } from "./types";

export async function getCandidateProfile(): Promise<CandidateProfile> {
  return apiGet<CandidateProfile>("/profiles/candidate/me");
}

export async function updateCandidateProfile(
  payload: CandidateProfileUpdate
): Promise<CandidateProfile> {
  return apiPut<CandidateProfile>("/profiles/candidate/me", payload);
}

export function isCandidateProfileMissing(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function canUseProfileDemoFallback(error: unknown): boolean {
  if (!isDemoFallbackEnabled()) return false;
  if (error instanceof ApiError) {
    if (error.status === 401) {
      clearApiSession();
      return true;
    }
    return error.isNetworkError || error.status === undefined || error.status >= 500;
  }
  return true;
}

export function profileErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session expired. Sign in again to save this profile.";
    if (error.status === 403) return "Candidate profile access is only available for student accounts.";
    if (error.status === 404) return "Candidate profile has not been created yet.";
    if (error.status === 422) return "Check the profile fields and try again.";
    if (error.status && error.status >= 500) return "Profile service is temporarily unavailable.";
    return error.message || "Profile request failed.";
  }
  return "Profile request failed.";
}
