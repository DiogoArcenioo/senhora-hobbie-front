export const TOKEN_STORAGE_KEY = "senhora_hobbie_access_token";
export const TOKEN_TYPE_STORAGE_KEY = "senhora_hobbie_token_type";
export const AUTH_USER_STORAGE_KEY = "senhora_hobbie_auth_user";
export const AUTH_SESSION_EVENT = "senhora_hobbie_auth_session_changed";

type JwtPayload = {
  exp?: unknown;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const normalizedPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    const decodedPayload = atob(paddedPayload);
    const payload = JSON.parse(decodedPayload) as JwtPayload;

    if (!payload || typeof payload !== "object") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function emitAuthSessionChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export function clearAuthSession(options?: { emitEvent?: boolean }): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(TOKEN_TYPE_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);

  if (options?.emitEvent ?? true) {
    emitAuthSessionChanged();
  }
}

export function getAuthSessionExpirationEpochMs(token: string): number | null {
  const jwtPayload = decodeJwtPayload(token);

  if (typeof jwtPayload?.exp !== "number" || !Number.isFinite(jwtPayload.exp)) {
    return null;
  }

  return Math.floor(jwtPayload.exp * 1000);
}

export function isAuthSessionTokenExpired(token: string, nowMs = Date.now()): boolean {
  const expirationEpochMs = getAuthSessionExpirationEpochMs(token);

  if (expirationEpochMs === null) {
    return false;
  }

  return expirationEpochMs <= nowMs;
}

export function getAuthSessionToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  const normalizedToken = typeof token === "string" ? token.trim() : "";

  if (!normalizedToken) {
    return null;
  }

  if (isAuthSessionTokenExpired(normalizedToken)) {
    clearAuthSession({ emitEvent: true });
    return null;
  }

  return normalizedToken;
}

export function getAuthSessionAuthorizationHeader(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = getAuthSessionToken();

  if (!token) {
    return null;
  }

  const tokenType = window.localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";
  return `${tokenType} ${token}`;
}

export function hasAuthSessionToken(): boolean {
  return getAuthSessionToken() !== null;
}
