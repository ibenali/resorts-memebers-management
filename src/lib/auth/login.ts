import "server-only";
import { and, count, eq, gt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { audit } from "./audit";
import { authConfig } from "./config";
import { isLocked, registerFailure } from "./lockout";
import { DUMMY_HASH, verifyPassword } from "./password";
import { createSession, purgeExpiredSessions } from "./session";

export type LoginResult =
  { ok: true; mustChangePassword: boolean } | { ok: false; reason: "invalid" | "ip_blocked" };

async function ipBlocked(ip: string | null, now: Date): Promise<boolean> {
  if (!ip) return false;
  const since = new Date(now.getTime() - authConfig.ipWindowMs);
  const [row] = await getDb()
    .select({ n: count() })
    .from(schema.auditLog)
    .where(
      and(
        eq(schema.auditLog.ip, ip),
        eq(schema.auditLog.action, "login_failed"),
        gt(schema.auditLog.createdAt, since),
      ),
    );
  return (row?.n ?? 0) >= authConfig.ipMaxFailures;
}

/**
 * Prüft Mitgliedsnummer und Passwort und legt bei Erfolg eine Session an.
 * Der Passwortvergleich läuft immer (auch bei unbekannter Nummer oder Sperre),
 * damit die Antwortzeit keine Rückschlüsse zulässt.
 */
export async function login(input: {
  memberNo: string;
  password: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<LoginResult> {
  const now = new Date();
  const db = getDb();

  if (await ipBlocked(input.ip, now)) {
    await verifyPassword(input.password, DUMMY_HASH);
    await audit("login_ip_blocked", null, input.ip);
    return { ok: false, reason: "ip_blocked" };
  }

  const [member] = await db
    .select({
      id: schema.members.id,
      passwordHash: schema.members.passwordHash,
      failedLogins: schema.members.failedLogins,
      lockedUntil: schema.members.lockedUntil,
      mustChangePassword: schema.members.mustChangePassword,
    })
    .from(schema.members)
    .where(eq(schema.members.memberNo, input.memberNo))
    .limit(1);

  const passwordOk = await verifyPassword(input.password, member?.passwordHash ?? DUMMY_HASH);

  if (!member) {
    await audit("login_failed", null, input.ip);
    return { ok: false, reason: "invalid" };
  }

  if (isLocked(member, now)) {
    // Auch ein richtiges Passwort hilft während der Sperre nicht.
    await audit("login_locked", member.id, input.ip);
    return { ok: false, reason: "invalid" };
  }

  if (!passwordOk) {
    const next = registerFailure(member, now);
    await db.update(schema.members).set(next).where(eq(schema.members.id, member.id));
    await audit("login_failed", member.id, input.ip);
    return { ok: false, reason: "invalid" };
  }

  await db
    .update(schema.members)
    .set({ failedLogins: 0, lockedUntil: null })
    .where(eq(schema.members.id, member.id));
  await purgeExpiredSessions(member.id);
  await createSession(member.id, input.userAgent);
  await audit("login_success", member.id, input.ip);
  return { ok: true, mustChangePassword: member.mustChangePassword };
}
