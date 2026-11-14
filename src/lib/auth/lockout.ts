import { authConfig } from "./config";

export type LockState = { failedLogins: number; lockedUntil: Date | null };

export function isLocked(state: LockState, now: Date): boolean {
  return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime();
}

/**
 * Neuer Zustand nach einem Fehlversuch. Ist eine frühere Sperre abgelaufen,
 * beginnt die Zählung von vorn.
 */
export function registerFailure(state: LockState, now: Date): LockState {
  const expired = state.lockedUntil !== null && state.lockedUntil.getTime() <= now.getTime();
  const failedLogins = (expired ? 0 : state.failedLogins) + 1;
  const lockedUntil =
    failedLogins >= authConfig.maxFailedLogins
      ? new Date(now.getTime() + authConfig.lockDurationMs)
      : null;
  return { failedLogins, lockedUntil };
}
