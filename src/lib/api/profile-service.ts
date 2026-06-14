import { apiGet, apiPut } from "./client";
import { ApiError } from "./errors";
import { canUseDemoFallbackForError } from "./fallback";
import { CandidateProfile, CandidateProfileUpdate } from "./types";

const PROFILE_CACHE_TTL_MS = 2000;
let profileCache: { value: CandidateProfile; expiresAt: number } | null = null;
let profileInFlight: Promise<CandidateProfile> | null = null;

export async function getCandidateProfile(): Promise<CandidateProfile> {
  const now = Date.now();
  if (profileCache && profileCache.expiresAt > now) {
    return profileCache.value;
  }
  if (profileInFlight) {
    return profileInFlight;
  }

  profileInFlight = apiGet<CandidateProfile>("/profiles/candidate/me")
    .then((profile) => {
      profileCache = { value: profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS };
      return profile;
    })
    .finally(() => {
      profileInFlight = null;
    });
  return profileInFlight;
}

export async function updateCandidateProfile(
  payload: CandidateProfileUpdate
): Promise<CandidateProfile> {
  const profile = await apiPut<CandidateProfile>("/profiles/candidate/me", payload);
  profileCache = { value: profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS };
  return profile;
}

export function isCandidateProfileMissing(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function canUseProfileDemoFallback(error: unknown): boolean {
  return canUseDemoFallbackForError(error);
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
