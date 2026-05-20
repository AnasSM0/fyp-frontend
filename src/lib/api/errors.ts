export class ApiError extends Error {
  status?: number;
  code: string;
  details?: unknown;
  isNetworkError: boolean;

  constructor({
    message,
    status,
    code,
    details,
    isNetworkError = false,
  }: {
    message: string;
    status?: number;
    code: string;
    details?: unknown;
    isNetworkError?: boolean;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.isNetworkError = isNetworkError;
  }
}

function detailToMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String(item.msg);
        }
        return "Validation error";
      })
      .join(", ");
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    return String(detail.message);
  }
  return "Request failed";
}

function codeForStatus(status: number): string {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation_error";
  if (status >= 500) return "server_error";
  return "api_error";
}

export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  const detail =
    payload && typeof payload === "object" && "detail" in payload
      ? (payload as { detail: unknown }).detail
      : payload;

  return new ApiError({
    status: response.status,
    code: codeForStatus(response.status),
    message: detailToMessage(detail),
    details: payload,
  });
}

export function apiErrorFromUnknown(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiError({
      code: "request_timeout",
      message: "Backend request timed out",
      isNetworkError: true,
    });
  }
  if (error instanceof Error) {
    return new ApiError({
      code: "network_error",
      message: error.message || "Backend is unavailable",
      isNetworkError: true,
      details: error,
    });
  }
  return new ApiError({
    code: "network_error",
    message: "Backend is unavailable",
    isNetworkError: true,
    details: error,
  });
}

export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}
