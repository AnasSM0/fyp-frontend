import { apiGet, apiPost } from "./client";
import { ApiError } from "./errors";
import { canUseDemoFallbackForError } from "./fallback";
import {
  IntegrityBatchResponse,
  IntegrityEventBatchCreate,
  IntegritySummary,
} from "./types";

export async function submitIntegrityEventsBatch(
  payload: IntegrityEventBatchCreate
): Promise<IntegrityBatchResponse> {
  return apiPost<IntegrityBatchResponse>("/integrity/events/batch", payload);
}

export async function getIntegritySummary(sessionId: string): Promise<IntegritySummary> {
  return apiGet<IntegritySummary>(`/integrity/sessions/${sessionId}/summary`);
}

export function canUseIntegrityDemoFallback(error: unknown): boolean {
  return canUseDemoFallbackForError(error);
}

export function integrityErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sign in again to record assessment integrity.";
    if (error.status === 403) return "Integrity events can only be submitted for your own assessment.";
    if (error.status === 404) return "Assessment session not found for integrity tracking.";
    if (error.status === 422) return "Integrity event payload was invalid.";
    if (error.status && error.status >= 500) return "Integrity service is temporarily unavailable.";
    return error.message || "Integrity request failed.";
  }
  return "Integrity request failed.";
}
