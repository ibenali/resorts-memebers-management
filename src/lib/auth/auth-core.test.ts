import { describe, expect, it } from "vitest";
import { authConfig } from "./config";
import { isLocked, registerFailure } from "./lockout";
import { checkPasswordPolicy, DUMMY_HASH, hashPassword, verifyPassword } from "./password";
import { safeRedirectPath } from "./redirect";
import { clientIpFrom } from "./request-info";
import { initialExpiry, isSessionValid, slidingExpiry } from "./session-policy";
import { generateSessionToken, hashSessionToken } from "./tokens";

const t0 = new Date("2026-06-01T12:00:00Z");
const plus = (ms: number) => new Date(t0.getTime() + ms);
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

describe("Session-Token", () => {
  it("erzeugt 32 Byte Zufall und speichert nur den SHA-256-Hash", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(Buffer.from(a, "base64url")).toHaveLength(32);
    expect(hashSessionToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(a)).toBe(hashSessionToken(a));
    expect(hashSessionToken(a)).not.toBe(hashSessionToken(b));
  });
});

describe("Passwörter", () => {
  it("hasht mit bcrypt Kosten 12 und verifiziert", async () => {
    const hash = await hashPassword("ein-gutes-passwort");
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(await verifyPassword("ein-gutes-passwort", hash)).toBe(true);
    expect(await verifyPassword("falsch-falsch", hash)).toBe(false);
  });

  it("Dummy-Hash ist ein gültiger Kosten-12-Hash", async () => {
    expect(DUMMY_HASH).toMatch(/^\$2b\$12\$.{53}$/);
    expect(await verifyPassword("irgendwas", DUMMY_HASH)).toBe(false);
  });

  it("prüft die Richtlinie", () => {
    expect(checkPasswordPolicy("kurz")).toBe("too_short");
    expect(checkPasswordPolicy("x".repeat(129))).toBe("too_long");
    expect(checkPasswordPolicy("Passwort123")).toBe("common");
    expect(checkPasswordPolicy("geheim-m100001-xy", "M100001")).toBe("contains_member_no");
    expect(checkPasswordPolicy("Blauer-Elefant-42", "M100001")).toBeNull();
  });
});

describe("Kontosperre", () => {
  it(`sperrt nach ${authConfig.maxFailedLogins} Fehlversuchen für 15 Minuten`, () => {
    let state = { failedLogins: 0, lockedUntil: null as Date | null };
    for (let i = 1; i < authConfig.maxFailedLogins; i++) {
      state = registerFailure(state, t0);
      expect(state.lockedUntil).toBeNull();
      expect(isLocked(state, t0)).toBe(false);
    }
    state = registerFailure(state, t0);
    expect(state.failedLogins).toBe(authConfig.maxFailedLogins);
    expect(state.lockedUntil).toEqual(plus(15 * MIN));
    expect(isLocked(state, plus(14 * MIN))).toBe(true);
    expect(isLocked(state, plus(15 * MIN))).toBe(false);
  });

  it("beginnt nach Ablauf der Sperre neu zu zählen", () => {
    const expired = { failedLogins: 5, lockedUntil: plus(-1) };
    expect(registerFailure(expired, t0)).toEqual({ failedLogins: 1, lockedUntil: null });
  });
});

describe("Session-Laufzeit", () => {
  const created = { createdAt: t0, expiresAt: initialExpiry(t0) };

  it("ist 7 Tage gültig", () => {
    expect(created.expiresAt).toEqual(plus(7 * DAY));
    expect(isSessionValid(created, plus(7 * DAY - 1))).toBe(true);
    expect(isSessionValid(created, plus(7 * DAY))).toBe(false);
  });

  it("verlängert gleitend, aber nicht bei jedem Request", () => {
    expect(slidingExpiry(created, plus(10 * MIN))).toBeNull();
    expect(slidingExpiry(created, plus(2 * DAY))).toEqual(plus(9 * DAY));
  });

  it("endet spätestens 30 Tage nach dem Login", () => {
    const late = { createdAt: t0, expiresAt: plus(28 * DAY) };
    expect(slidingExpiry(late, plus(27 * DAY))).toEqual(plus(30 * DAY));
    expect(isSessionValid({ createdAt: t0, expiresAt: plus(31 * DAY) }, plus(30 * DAY))).toBe(
      false,
    );
  });
});

describe("Rücksprungziel", () => {
  it.each([
    ["/resorts", "/resorts"],
    ["/urlaub?x=1", "/urlaub?x=1"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["https://evil.example", "/"],
    ["/login", "/"],
    ["", "/"],
    [undefined, "/"],
  ])("%s → %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});

describe("Client-IP", () => {
  it("nimmt den vom Proxy angehängten letzten X-Forwarded-For-Eintrag", () => {
    const h = new Headers({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" });
    expect(clientIpFrom(h)).toBe("203.0.113.7");
  });
  it("fällt auf X-Real-IP zurück oder null", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIpFrom(new Headers())).toBeNull();
  });
});
