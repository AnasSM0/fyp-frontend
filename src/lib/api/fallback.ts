import { appConfig } from "@/lib/config";
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
    markBackendUnavailable();
    if (!shouldFallback()) throw error;
    return fallback({ error, operation });
  }
}
