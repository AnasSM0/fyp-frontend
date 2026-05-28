import { apiPost } from "./client";
import { appConfig } from "@/lib/config";
import { ApiError } from "./errors";
import { canUseDemoFallbackForError } from "./fallback";
import { OnboardingChatRequest, OnboardingChatResponse } from "./types";

export async function sendOnboardingChatMessage(
  payload: OnboardingChatRequest
): Promise<OnboardingChatResponse> {
  return apiPost<OnboardingChatResponse>("/ai/onboarding/chat", payload, {
    timeoutMs: appConfig.aiRequestTimeoutMs,
  });
}

export function canUseOnboardingAIDemoFallback(error: unknown): boolean {
  return canUseDemoFallbackForError(error);
}

export function onboardingAIErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sign in again to use AI onboarding.";
    if (error.status === 403) return "AI onboarding is only available for candidate accounts.";
    if (error.status === 422) return "Check your onboarding message and try again.";
    if (error.status && error.status >= 500) return "AI onboarding is temporarily unavailable.";
    return error.message || "AI onboarding request failed.";
  }
  return "AI onboarding request failed.";
}
