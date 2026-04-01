export const TOKEN_STORAGE_KEY = "senhora_hobbie_access_token";
export const TOKEN_TYPE_STORAGE_KEY = "senhora_hobbie_token_type";
export const AUTH_USER_STORAGE_KEY = "senhora_hobbie_auth_user";
export const AUTH_SESSION_EVENT = "senhora_hobbie_auth_session_changed";

export function hasAuthSessionToken(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  return typeof token === "string" && token.trim().length > 0;
}

export function emitAuthSessionChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}
