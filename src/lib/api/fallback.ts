import { appConfig } from "@/lib/config";
import { ApiError } from "./errors";
import { ApiFallbackContext } from "./types";

const API_UNAVAILABLE_KEY = "xlr8_api_unavailable";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function isDemoFallbackEnabled(): boolean {
  return appConfig.demoFallbackEnabled;
}

export function markBackendUnavailable(): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(API_UNAVAILABLE_KEY, "true");
}

export function clearBackendUnavailable(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(API_UNAVAILABLE_KEY);
}

export function isBackendMarkedUnavailable(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(API_UNAVAILABLE_KEY) === "true";
}

export function canUseDemoFallbackForError(error: unknown): boolean {
  if (!isDemoFallbackEnabled()) return false;
  if (error instanceof ApiError) {
    return error.isNetworkError || error.status === undefined || error.status >= 500;
  }
  return true;
}

export function fallbackReason(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return error.code || "network_error";
    if (error.status === undefined) return "backend_unavailable";
    if (error.status >= 500) return `http_${error.status}`;
    return `not_fallback_eligible_http_${error.status}`;
  }
  return "unknown_network_or_runtime_error";
}

export async function withDemoFallback<T>({
  operation,
  request,
  fallback,
  shouldFallback = isDemoFallbackEnabled,
}: {
  operation: string;
  request: () => Promise<T>;
  fallback: (context: ApiFallbackContext) => T | Promise<T>;
  shouldFallback?: () => boolean;
}): Promise<T> {
  try {
    const value = await request();
    clearBackendUnavailable();
    return value;
  } catch (error) {
    if (!canUseDemoFallbackForError(error) || !shouldFallback()) throw error;
    markBackendUnavailable();
    return fallback({ error, operation });
  }
}
