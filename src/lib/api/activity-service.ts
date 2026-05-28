import { apiGet } from "./client";
import { ApiError } from "./errors";
import { canUseDemoFallbackForError } from "./fallback";
import { ActivityFeedResponse } from "./types";

export async function getMyActivity(): Promise<ActivityFeedResponse> {
  return apiGet<ActivityFeedResponse>("/activity/me");
}

export function canUseActivityDemoFallback(error: unknown): boolean {
  return canUseDemoFallbackForError(error);
}

export function activityErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sign in again to view activity.";
    if (error.status === 403) return "You do not have access to this activity feed.";
    if (error.status && error.status >= 500) return "Activity service is temporarily unavailable.";
    return error.message || "Activity request failed.";
  }
  return "Activity request failed.";
}
