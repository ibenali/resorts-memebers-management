/**
 * Nur interne Pfade als Rücksprungziel zulassen (kein Open Redirect über ?next=).
 */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 500) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  if (value.startsWith("/login")) return fallback;
  return value;
}
