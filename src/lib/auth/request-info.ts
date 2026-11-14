import { headers } from "next/headers";

/**
 * Client-IP hinter genau einem Reverse Proxy (Caddy/Hostinger): der Proxy hängt
 * die echte Adresse rechts an X-Forwarded-For an, linke Einträge kann der Client
 * fälschen. Daher zählt der letzte Eintrag.
 */
export function clientIpFrom(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const last = parts.at(-1);
    if (last) return last.slice(0, 45);
  }
  return h.get("x-real-ip")?.slice(0, 45) ?? null;
}

export async function getRequestInfo(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  return { ip: clientIpFrom(h), userAgent: h.get("user-agent")?.slice(0, 255) ?? null };
}
