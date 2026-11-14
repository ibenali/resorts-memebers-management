import { createHash, randomBytes } from "node:crypto";

/** 32 Byte Zufall, base64url-kodiert (43 Zeichen), wird nur im Cookie gespeichert. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 (hex, 64 Zeichen) des Tokens; nur dieser Wert landet in der Datenbank. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
