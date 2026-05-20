import { appConfig } from "@/lib/config";
import { getApiToken } from "./auth";
import { apiErrorFromResponse, apiErrorFromUnknown } from "./errors";
import { clearBackendUnavailable, markBackendUnavailable } from "./fallback";
import { ApiRequestOptions, BackendHealth, BackendHealthResult } from "./types";

function joinUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${appConfig.apiBaseUrl}${normalizedPath}`;
}

function isJsonBody(body: unknown): boolean {
  if (body === null || body === undefined) return false;
  if (typeof FormData !== "undefined" && body instanceof FormData) return false;
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return false;
  if (typeof Blob !== "undefined" && body instanceof Blob) return false;
  if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) return false;
  return typeof body === "object" || Array.isArray(body);
}

function buildHeaders(headers: HeadersInit | undefined, hasJsonBody: boolean, auth: boolean): Headers {
  const nextHeaders = new Headers(headers);
  if (hasJsonBody && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getApiToken();
    if (token) nextHeaders.set("Authorization", `Bearer ${token}`);
  }
  
  if (typeof window !== "undefined") {
    const devProvider = window.localStorage.getItem("dev_ai_provider");
    if (devProvider) {
      nextHeaders.set("X-AI-Provider", devProvider);
    }
  }
  
  return nextHeaders;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, body, headers, timeoutMs, ...requestInit } = options;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    timeoutMs ?? appConfig.apiRequestTimeoutMs
  );
  const hasJsonBody = isJsonBody(body);

  try {
    const response = await fetch(joinUrl(path), {
      ...requestInit,
      body: hasJsonBody ? JSON.stringify(body) : (body as BodyInit | null | undefined),
      headers: buildHeaders(headers, hasJsonBody, auth),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw await apiErrorFromResponse(response);
    }

    clearBackendUnavailable();

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("Content-Type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    return (await response.text()) as T;
  } catch (error) {
    const normalizedError = apiErrorFromUnknown(error);
    if (normalizedError.isNetworkError) markBackendUnavailable();
    throw normalizedError;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function apiGet<T>(path: string, options: Omit<ApiRequestOptions, "method" | "body"> = {}) {
  return apiRequest<T>(path, { ...options, method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, "method" | "body"> = {}) {
  return apiRequest<T>(path, { ...options, method: "POST", body });
}

export function apiPut<T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, "method" | "body"> = {}) {
  return apiRequest<T>(path, { ...options, method: "PUT", body });
}

export function apiPatch<T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, "method" | "body"> = {}) {
  return apiRequest<T>(path, { ...options, method: "PATCH", body });
}

export function apiDelete<T>(path: string, options: Omit<ApiRequestOptions, "method" | "body"> = {}) {
  return apiRequest<T>(path, { ...options, method: "DELETE" });
}

export async function checkBackendHealth(): Promise<BackendHealthResult> {
  try {
    const health = await apiGet<BackendHealth>("/health", {
      auth: false,
      timeoutMs: appConfig.apiHealthTimeoutMs,
    });
    clearBackendUnavailable();
    return { available: true, health };
  } catch (error) {
    markBackendUnavailable();
    return { available: false, error };
  }
}
