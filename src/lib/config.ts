function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBaseUrl(value: string | undefined): string {
  const baseUrl = value?.trim() || "http://localhost:8000";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export const appConfig = {
  apiBaseUrl: normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
  demoFallbackEnabled: parseBoolean(process.env.NEXT_PUBLIC_DEMO_FALLBACK, true),
  apiHealthTimeoutMs: parseNumber(process.env.NEXT_PUBLIC_API_HEALTH_TIMEOUT_MS, 2500),
  apiRequestTimeoutMs: parseNumber(process.env.NEXT_PUBLIC_API_REQUEST_TIMEOUT_MS, 30000),
  aiRequestTimeoutMs: parseNumber(process.env.NEXT_PUBLIC_AI_REQUEST_TIMEOUT_MS, 90000),
};
