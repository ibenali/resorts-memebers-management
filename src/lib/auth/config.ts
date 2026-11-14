/** Zentrale Sicherheitsparameter (siehe docs/PLAN.md, Kap. 7). */
export const authConfig = {
  bcryptCost: 12,
  passwordMinLength: 10,
  passwordMaxLength: 128,
  /** Gleitende Session-Laufzeit. */
  sessionIdleMs: 7 * 24 * 60 * 60 * 1000,
  /** Harte Obergrenze ab Login. */
  sessionAbsoluteMs: 30 * 24 * 60 * 60 * 1000,
  /** Verlängerung erst, wenn weniger als das übrig ist (spart DB-Schreibzugriffe). */
  sessionRefreshThresholdMs: (7 * 24 - 1) * 60 * 60 * 1000,
  maxFailedLogins: 5,
  lockDurationMs: 15 * 60 * 1000,
  /** Fehlversuche pro IP im Zeitfenster, danach werden Logins von dieser IP abgewiesen. */
  ipMaxFailures: 20,
  ipWindowMs: 15 * 60 * 1000,
  cookieName: "session",
} as const;
