import { apiGet, apiPost } from "./client";
import { ApiError } from "./errors";
import { clearApiSession } from "./auth";
import { isDemoFallbackEnabled } from "./fallback";
import {
  CandidateEmbeddingRebuildResponse,
  CandidateEmbeddingStatus,
} from "./types";

export async function getCandidateEmbeddingStatus(): Promise<CandidateEmbeddingStatus> {
  return apiGet<CandidateEmbeddingStatus>("/embeddings/candidates/me/status");
}

export async function rebuildMyCandidateEmbedding(): Promise<CandidateEmbeddingRebuildResponse> {
  return apiPost<CandidateEmbeddingRebuildResponse>("/embeddings/candidates/me/rebuild", {});
}

export function canUseEmbeddingDemoFallback(error: unknown): boolean {
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

export function embeddingErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sign in again to view discovery readiness.";
    if (error.status === 403) return "Only candidate accounts can view embedding status.";
    if (error.status === 404) return "Candidate profile not found.";
    if (error.status === 409) return error.message || "Publish your report before rebuilding discovery data.";
    if (error.status === 422) return "Embedding request was invalid.";
    if (error.status && error.status >= 500) return "Embedding service is temporarily unavailable.";
    return error.message || "Embedding request failed.";
  }
  return "Embedding request failed.";
}
