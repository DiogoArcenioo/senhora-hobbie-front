"use client";

import { useEffect, useRef } from "react";
import {
  AUTH_SESSION_EVENT,
  getAuthSessionExpirationEpochMs,
  getAuthSessionToken,
  hasAuthSessionToken,
} from "@/app/lib/auth-session";

const EXPIRATION_CHECK_GRACE_MS = 1000;

export default function AuthSessionWatcher() {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const clearScheduledCheck = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const scheduleNextExpirationCheck = () => {
      clearScheduledCheck();

      const token = getAuthSessionToken();

      if (!token) {
        return;
      }

      const expirationEpochMs = getAuthSessionExpirationEpochMs(token);

      if (expirationEpochMs === null) {
        return;
      }

      const delayMs = Math.max(
        0,
        expirationEpochMs - Date.now() + EXPIRATION_CHECK_GRACE_MS,
      );

      timeoutRef.current = window.setTimeout(() => {
        hasAuthSessionToken();
        scheduleNextExpirationCheck();
      }, delayMs);
    };

    scheduleNextExpirationCheck();
    window.addEventListener(AUTH_SESSION_EVENT, scheduleNextExpirationCheck);
    window.addEventListener("storage", scheduleNextExpirationCheck);

    return () => {
      clearScheduledCheck();
      window.removeEventListener(AUTH_SESSION_EVENT, scheduleNextExpirationCheck);
      window.removeEventListener("storage", scheduleNextExpirationCheck);
    };
  }, []);

  return null;
}
