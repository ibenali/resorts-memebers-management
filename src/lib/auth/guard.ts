import "server-only";
import { redirect } from "next/navigation";
import { getCurrentSession, type CurrentSession } from "./session";

export const CHANGE_PASSWORD_PATH = "/passwort-aendern";

/**
 * Für alle Mitgliederseiten: ohne Session zum Login, mit Pflicht zum
 * Passwortwechsel auf die Wechsel-Seite.
 */
export async function requireMember(): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.member.mustChangePassword) redirect(CHANGE_PASSWORD_PATH);
  return session;
}

/** Wie requireMember, aber ohne Weiterleitung bei must_change_password. */
export async function requireSession(): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}
