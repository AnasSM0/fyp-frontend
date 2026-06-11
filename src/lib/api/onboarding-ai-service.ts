import { apiPost } from "./client";
import { appConfig } from "@/lib/config";
import { ApiError } from "./errors";
import { canUseDemoFallbackForError } from "./fallback";
import { OnboardingChatRequest, OnboardingChatResponse, ResumeParseResponse } from "./types";

export async function sendOnboardingChatMessage(
  payload: OnboardingChatRequest
): Promise<OnboardingChatResponse> {
  return apiPost<OnboardingChatResponse>("/ai/onboarding/chat", payload, {
    timeoutMs: appConfig.aiRequestTimeoutMs,
  });
}

export async function parseResume(file: File): Promise<ResumeParseResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return apiPost<ResumeParseResponse>("/onboarding/resume/parse", formData, {
    timeoutMs: appConfig.aiRequestTimeoutMs,
  });
}

export function canUseOnboardingAIDemoFallback(error: unknown): boolean {
  return canUseDemoFallbackForError(error);
}

export function resumeParseErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sign in again to upload a resume.";
    if (error.status === 403) return "Resume-assisted onboarding is only available for candidate accounts.";
    if (error.status === 413) return "Resume file is too large. Upload a PDF or DOCX up to 5MB.";
    if (error.status === 422) return "We could not read enough resume text. Please upload a text-based PDF/DOCX or enter details manually.";
    if (error.status && error.status >= 500) return "Resume parsing is temporarily unavailable. You can enter details manually.";
    return error.message || "Resume parsing failed. Please enter details manually.";
  }
  return "Resume parsing failed. Please enter details manually.";
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
