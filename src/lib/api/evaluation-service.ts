import { apiGet, apiPost } from "./client";
import { ApiError } from "./errors";
import { canUseDemoFallbackForError } from "./fallback";
import {
  EvaluationCoachRequest,
  EvaluationCoachResponse,
  EvaluationReportDetail,
  PublishReportResponse,
} from "./types";

export async function generateEvaluationReport(
  sessionId: string,
  forceRegenerate = false
): Promise<EvaluationReportDetail> {
  const response = await apiPost<unknown>(`/evaluations/sessions/${sessionId}/generate`, {
    force_regenerate: forceRegenerate,
  });
  if (isEvaluationReportDetail(response)) return response;
  if (isGenerationInProgressPayload(response)) {
    throw new ApiError({
      status: 202,
      code: "generation_in_progress",
      message: "Report generation is already in progress.",
      details: response,
    });
  }
  throw new ApiError({
    code: "invalid_report_response",
    message: "Evaluation service returned an unexpected report response.",
    details: response,
  });
}

export async function getLatestEvaluationReport(): Promise<EvaluationReportDetail | null> {
  return apiGet<EvaluationReportDetail | null>("/evaluations/reports/me/latest");
}

export async function getEvaluationReport(reportId: string): Promise<EvaluationReportDetail> {
  return apiGet<EvaluationReportDetail>(`/evaluations/reports/${reportId}`);
}

export async function getEvaluationReportBySession(sessionId: string): Promise<EvaluationReportDetail> {
  return apiGet<EvaluationReportDetail>(`/evaluations/reports/session/${sessionId}`);
}

export async function publishEvaluationReport(reportId: string): Promise<PublishReportResponse> {
  return apiPost<PublishReportResponse>(`/evaluations/reports/${reportId}/publish`, {});
}

export async function coachEvaluationReport(
  reportId: string,
  payload: EvaluationCoachRequest
): Promise<EvaluationCoachResponse> {
  return apiPost<EvaluationCoachResponse>(`/evaluations/reports/${reportId}/coach`, payload);
}

export function isEvaluationReportMissing(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function isReportGenerationInProgress(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 202 || error.code === "generation_in_progress");
}

export function isAiEvaluationUnavailable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const detail = apiErrorDetail(error);
  const code = typeof detail.code === "string" ? detail.code : error.code;
  return (error.status === 429 || error.status === 503) && code === "ai_provider_unavailable";
}

export function evaluationRetryAfterSeconds(error: unknown): number | null {
  if (!(error instanceof ApiError)) return null;
  const detail = apiErrorDetail(error);
  return typeof detail.retry_after_seconds === "number" ? detail.retry_after_seconds : null;
}

export function canUseEvaluationDemoFallback(error: unknown): boolean {
  if (isAiEvaluationUnavailable(error) || isReportGenerationInProgress(error)) return false;
  return canUseDemoFallbackForError(error);
}

export function evaluationErrorMessage(error: unknown): string {
  if (isAiEvaluationUnavailable(error)) {
    const retryAfter = evaluationRetryAfterSeconds(error);
    return retryAfter
      ? `AI evaluation is temporarily unavailable. Please retry in about ${retryAfter} seconds.`
      : "AI evaluation is temporarily unavailable. Please retry in a moment.";
  }
  if (isReportGenerationInProgress(error)) {
    return "Report generation is in progress. This page will check for the completed report shortly.";
  }
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sign in again to view your verified report.";
    if (error.status === 403) return "Only candidate accounts can access AI reports.";
    if (error.status === 404) return "Evaluation report not found.";
    if (error.status === 409) return error.message || "Complete the assessment before generating a report.";
    if (error.status === 422) return "Report request was invalid. Check the session and try again.";
    if (error.status && error.status >= 500) return "Evaluation service is temporarily unavailable.";
    return error.message || "Evaluation request failed.";
  }
  return "Evaluation request failed.";
}

function isEvaluationReportDetail(value: unknown): value is EvaluationReportDetail {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      "session_id" in value &&
      "verified_score" in value &&
      "report_json" in value
  );
}

function isGenerationInProgressPayload(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.code === "generation_in_progress" || record.status === "generation_in_progress";
}

function apiErrorDetail(error: ApiError): Record<string, unknown> {
  const payload = error.details;
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail;
    return detail && typeof detail === "object" && !Array.isArray(detail)
      ? (detail as Record<string, unknown>)
      : {};
  }
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}
