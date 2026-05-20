import { apiGet, apiPost } from "./client";
import { ApiError } from "./errors";
import { clearApiSession } from "./auth";
import { isDemoFallbackEnabled } from "./fallback";
import { EvaluationReportDetail, PublishReportResponse } from "./types";

export async function generateEvaluationReport(
  sessionId: string,
  forceRegenerate = false
): Promise<EvaluationReportDetail> {
  return apiPost<EvaluationReportDetail>(`/evaluations/sessions/${sessionId}/generate`, {
    force_regenerate: forceRegenerate,
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

export function isEvaluationReportMissing(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function canUseEvaluationDemoFallback(error: unknown): boolean {
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

export function evaluationErrorMessage(error: unknown): string {
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
