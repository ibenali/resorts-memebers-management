import { authConfig } from "./config";

export type SessionTimes = { createdAt: Date; expiresAt: Date };

export function initialExpiry(now: Date): Date {
  return new Date(now.getTime() + authConfig.sessionIdleMs);
}

export function isSessionValid(s: SessionTimes, now: Date): boolean {
  const absoluteEnd = s.createdAt.getTime() + authConfig.sessionAbsoluteMs;
  return s.expiresAt.getTime() > now.getTime() && absoluteEnd > now.getTime();
}

/**
 * Neues Ablaufdatum, wenn die Session verlängert werden soll, sonst null.
 * Nie über die absolute Obergrenze hinaus.
 */
export function slidingExpiry(s: SessionTimes, now: Date): Date | null {
  const remaining = s.expiresAt.getTime() - now.getTime();
  if (remaining > authConfig.sessionRefreshThresholdMs) return null;
  const absoluteEnd = s.createdAt.getTime() + authConfig.sessionAbsoluteMs;
  const next = Math.min(now.getTime() + authConfig.sessionIdleMs, absoluteEnd);
  return next > s.expiresAt.getTime() ? new Date(next) : null;
}
