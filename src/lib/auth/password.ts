import bcrypt from "bcryptjs";
import { commonPasswords } from "./common-passwords";
import { authConfig } from "./config";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, authConfig.bcryptCost);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Gültiger bcrypt-Hash eines zufälligen Werts. Wird bei unbekannter
 * Mitgliedsnummer verglichen, damit die Antwortzeit nichts verrät.
 */
export const DUMMY_HASH = "$2b$12$xyKwRqTgKsliEnM0kbLsxOTqVdoQUO1nf0dWBTQSeUQzQ1WcNpyi2";

export type PasswordPolicyError = "too_short" | "too_long" | "common" | "contains_member_no";

/** Prüft ein neues Passwort gegen die Richtlinie. Gibt null zurück, wenn es passt. */
export function checkPasswordPolicy(
  password: string,
  memberNo?: string,
): PasswordPolicyError | null {
  if (password.length < authConfig.passwordMinLength) return "too_short";
  if (password.length > authConfig.passwordMaxLength) return "too_long";
  if (commonPasswords.has(password.toLowerCase())) return "common";
  if (memberNo && password.toLowerCase().includes(memberNo.toLowerCase())) {
    return "contains_member_no";
  }
  return null;
}
