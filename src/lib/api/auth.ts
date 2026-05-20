import { AuthSession, BackendUser } from "./types";

const TOKEN_KEY = "xlr8_api_token";
const USER_KEY = "xlr8_api_user";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getApiToken(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setApiToken(token: string): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredApiUser(): BackendUser | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BackendUser>;
    if (
      typeof parsed.id === "string" &&
      typeof parsed.email === "string" &&
      (parsed.role === "candidate" || parsed.role === "recruiter")
    ) {
      return {
        id: parsed.id,
        email: parsed.email,
        role: parsed.role,
        is_active: Boolean(parsed.is_active),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredApiUser(user: BackendUser): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function setApiSession(session: AuthSession): void {
  setApiToken(session.accessToken);
  setStoredApiUser(session.user);
}

export function clearApiSession(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function hasApiSession(): boolean {
  return Boolean(getApiToken() && getStoredApiUser());
}
