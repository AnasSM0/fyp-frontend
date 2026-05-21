const DEBUG_METADATA_KEY = "xlr8_show_debug_metadata";
const BLOCKED_KEY_PARTS = ["raw_json", "api_key", "secret", "token", "password"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isBlockedKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return BLOCKED_KEY_PARTS.some((part) => normalized.includes(part));
}

export function shouldShowDebugMetadata(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(DEBUG_METADATA_KEY) === "true";
  } catch {
    return false;
  }
}

export function sanitizeDebugMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeDebugMetadata(item))
      .filter((item) => item !== undefined);
  }

  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, item]) => !isBlockedKey(key) && item !== undefined && item !== null)
      .map(([key, item]) => [key, sanitizeDebugMetadata(item)])
  );
}

export function hasDebugMetadata(value: unknown): boolean {
  const sanitized = sanitizeDebugMetadata(value);
  if (Array.isArray(sanitized)) return sanitized.length > 0;
  if (isRecord(sanitized)) return Object.keys(sanitized).length > 0;
  return sanitized !== undefined && sanitized !== null && sanitized !== "";
}
