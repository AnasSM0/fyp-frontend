import { apiGet, apiPost } from "./client";
import { ApiError } from "./errors";
import { canUseDemoFallbackForError } from "./fallback";
import {
  AssessmentSessionDetail,
  CurrentQuestionResponse,
  RunCodeRequest,
  RunCodeResponse,
  StartAssessmentRequest,
  SubmitAssessmentAnswerRequest,
  SubmitAssessmentAnswerResponse,
} from "./types";

const ACTIVE_SESSION_KEY = "xlr8_active_assessment_session_id";
const FINISHED_SESSION_KEY = "xlr8_finished_assessment_session_id";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStoredActiveAssessmentSessionId(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function setStoredActiveAssessmentSessionId(sessionId: string): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
}

export function clearStoredActiveAssessmentSessionId(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ACTIVE_SESSION_KEY);
}

export function getStoredFinishedAssessmentSessionId(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(FINISHED_SESSION_KEY);
}

export function setStoredFinishedAssessmentSessionId(sessionId: string): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(FINISHED_SESSION_KEY, sessionId);
}

export function canUseAssessmentDemoFallback(error: unknown): boolean {
  return canUseDemoFallbackForError(error);
}

export function assessmentErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sign in again to start or continue this assessment.";
    if (error.status === 403) return "Only candidate accounts can use the assessment flow.";
    if (error.status === 404) return "Assessment session not found. Start a new session from prep.";
    if (error.status === 409) return error.message || "Complete your candidate profile before starting assessment.";
    if (error.status === 422) return "Check your answer and try again.";
    if (error.status && error.status >= 500) return "Assessment service is temporarily unavailable.";
    return error.message || "Assessment request failed.";
  }
  return "Assessment request failed.";
}

export async function startAssessmentSession(
  payload: StartAssessmentRequest = {}
): Promise<AssessmentSessionDetail> {
  return apiPost<AssessmentSessionDetail>("/assessments/sessions", payload);
}

export async function getLatestAssessmentSession(): Promise<AssessmentSessionDetail | null> {
  return apiGet<AssessmentSessionDetail | null>("/assessments/sessions/me/latest");
}

export async function getAssessmentSession(sessionId: string): Promise<AssessmentSessionDetail> {
  return apiGet<AssessmentSessionDetail>(`/assessments/sessions/${sessionId}`);
}

export async function getCurrentQuestion(sessionId: string): Promise<CurrentQuestionResponse> {
  return apiGet<CurrentQuestionResponse>(`/assessments/sessions/${sessionId}/current-question`);
}

export async function submitAssessmentAnswer(
  sessionId: string,
  payload: SubmitAssessmentAnswerRequest
): Promise<SubmitAssessmentAnswerResponse> {
  return apiPost<SubmitAssessmentAnswerResponse>(`/assessments/sessions/${sessionId}/answers`, payload);
}

export async function runAssessmentCode(
  sessionId: string,
  questionId: string,
  payload: RunCodeRequest
): Promise<RunCodeResponse> {
  return apiPost<RunCodeResponse>(
    `/assessments/sessions/${sessionId}/questions/${questionId}/run-code`,
    payload
  );
}

export async function finishAssessmentSession(sessionId: string): Promise<AssessmentSessionDetail> {
  return apiPost<AssessmentSessionDetail>(`/assessments/sessions/${sessionId}/finish`, {});
}
