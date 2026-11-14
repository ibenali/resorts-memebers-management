import { headers } from "next/headers";

/** Nur hinter einem eigenen Reverse Proxy (Caddy, Hostinger) auf "1" setzen. */
export function trustProxy(): boolean {
  return process.env.TRUST_PROXY === "1";
}

/**
 * Client-IP für Rate-Limit und Audit-Log.
 *
 * Proxy-Header kann jeder Client selbst setzen. Sie werden daher nur ausgewertet,
 * wenn TRUST_PROXY=1 gesetzt ist, also die App ausschließlich über einen eigenen
 * Proxy erreichbar ist. Dieser hängt die echte Adresse rechts an X-Forwarded-For an;
 * linke Einträge stammen vom Client, deshalb zählt der letzte Eintrag.
 * Ohne vertrauenswürdigen Proxy ist keine IP bekannt (null): Das IP-Limit greift
 * dann nicht, die Kontosperre pro Mitglied bleibt aktiv.
 */
export function clientIpFrom(h: Headers, trusted: boolean = trustProxy()): string | null {
  if (!trusted) return null;
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const last = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .at(-1);
    if (last) return last.slice(0, 45);
  }
  return h.get("x-real-ip")?.trim().slice(0, 45) || null;
}

export async function getRequestInfo(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  return { ip: clientIpFrom(h), userAgent: h.get("user-agent")?.slice(0, 255) ?? null };
}
