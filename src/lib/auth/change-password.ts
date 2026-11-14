import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { audit } from "./audit";
import {
  checkPasswordPolicy,
  hashPassword,
  verifyPassword,
  type PasswordPolicyError,
} from "./password";
import { deleteOtherSessions } from "./session";

export type ChangePasswordResult =
  { ok: true } | { ok: false; error: "wrong_current" | "same_as_current" | PasswordPolicyError };

/**
 * Ändert das Passwort des angemeldeten Mitglieds. Verlangt das aktuelle Passwort,
 * prüft die Richtlinie, hebt must_change_password auf und beendet alle anderen Sessions.
 * Wird vom erzwungenen Wechsel (WP3) und vom Profil (WP6) genutzt.
 */
export async function changePassword(input: {
  memberId: number;
  memberNo: string;
  sessionId: string;
  currentPassword: string;
  newPassword: string;
  ip: string | null;
}): Promise<ChangePasswordResult> {
  const db = getDb();
  const [member] = await db
    .select({ passwordHash: schema.members.passwordHash })
    .from(schema.members)
    .where(eq(schema.members.id, input.memberId));
  if (!member || !(await verifyPassword(input.currentPassword, member.passwordHash))) {
    return { ok: false, error: "wrong_current" };
  }
  if (input.currentPassword === input.newPassword) return { ok: false, error: "same_as_current" };

  const policyError = checkPasswordPolicy(input.newPassword, input.memberNo);
  if (policyError) return { ok: false, error: policyError };

  await db
    .update(schema.members)
    .set({ passwordHash: await hashPassword(input.newPassword), mustChangePassword: false })
    .where(eq(schema.members.id, input.memberId));
  await deleteOtherSessions(input.memberId, input.sessionId);
  await audit("password_changed", input.memberId, input.ip);
  return { ok: true };
}
