import { apiGet, apiPost } from "./client";
import { ApiError } from "./errors";
import { isDemoFallbackEnabled } from "./fallback";
import { clearApiSession, setApiSession } from "./auth";
import {
  AuthSession,
  AuthTokenResponse,
  BackendUser,
  BackendUserRole,
  DemoLoginRequest,
  LoginRequest,
  SignupRequest,
} from "./types";

function sessionFromResponse(response: AuthTokenResponse): AuthSession {
  return {
    accessToken: response.access_token,
    user: response.user,
  };
}

function persistAuthResponse(response: AuthTokenResponse): AuthSession {
  const session = sessionFromResponse(response);
  setApiSession(session);
  return session;
}

export function canUseAuthDemoFallback(error: unknown): boolean {
  if (!isDemoFallbackEnabled()) return false;
  if (error instanceof ApiError) {
    return error.isNetworkError || error.status === undefined || error.status >= 500;
  }
  return true;
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Invalid email or password.";
    if (error.status === 409) return "An account with this email already exists.";
    if (error.status === 422) return "Check the email, password, and selected role.";
    if (error.status === 403) return "You do not have access to this auth action.";
    if (error.status === 404) return error.message || "Requested auth resource was not found.";
    if (error.status && error.status >= 500) return "Backend auth is temporarily unavailable.";
    return error.message || "Authentication failed.";
  }
  return "Authentication failed.";
}

export async function signup(payload: SignupRequest): Promise<AuthSession> {
  const response = await apiPost<AuthTokenResponse>("/auth/signup", payload, { auth: false });
  return persistAuthResponse(response);
}

export async function login(payload: LoginRequest): Promise<AuthSession> {
  const response = await apiPost<AuthTokenResponse>("/auth/login", payload, { auth: false });
  return persistAuthResponse(response);
}

export async function demoLogin(role: BackendUserRole): Promise<AuthSession> {
  const response = await apiPost<AuthTokenResponse>(
    "/auth/demo-login",
    { role } satisfies DemoLoginRequest,
    { auth: false }
  );
  return persistAuthResponse(response);
}

export async function getCurrentUser(): Promise<BackendUser> {
  return apiGet<BackendUser>("/auth/me");
}

export function logout(): void {
  clearApiSession();
}
