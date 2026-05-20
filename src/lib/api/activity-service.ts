import { clearApiSession } from "./auth";
import { apiGet } from "./client";
import { ApiError } from "./errors";
import { isDemoFallbackEnabled } from "./fallback";
import { ActivityFeedResponse } from "./types";

export async function getMyActivity(): Promise<ActivityFeedResponse> {
  return apiGet<ActivityFeedResponse>("/activity/me");
}

export function canUseActivityDemoFallback(error: unknown): boolean {
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

export function activityErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sign in again to view activity.";
    if (error.status === 403) return "You do not have access to this activity feed.";
    if (error.status && error.status >= 500) return "Activity service is temporarily unavailable.";
    return error.message || "Activity request failed.";
  }
  return "Activity request failed.";
}
