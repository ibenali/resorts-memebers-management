import "server-only";
import { and, eq, lt, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb, schema } from "@/lib/db";
import { authConfig } from "./config";
import { initialExpiry, isSessionValid, slidingExpiry } from "./session-policy";
import { generateSessionToken, hashSessionToken } from "./tokens";

function secureCookies(): boolean {
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

/** Legt eine Session an und setzt das Cookie. Nur in Server Actions/Route Handlers aufrufen. */
export async function createSession(memberId: number, userAgent: string | null): Promise<void> {
  const token = generateSessionToken();
  const now = new Date();
  await getDb()
    .insert(schema.sessions)
    .values({
      id: hashSessionToken(token),
      memberId,
      createdAt: now,
      expiresAt: initialExpiry(now),
      userAgent,
    });
  const store = await cookies();
  store.set(authConfig.cookieName, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    // Das Cookie lebt bis zur absoluten Obergrenze; die gleitende Laufzeit prüft die DB.
    maxAge: Math.floor(authConfig.sessionAbsoluteMs / 1000),
  });
}

export type CurrentSession = {
  sessionId: string;
  member: {
    id: number;
    memberNo: string;
    firstName: string;
    lastName: string;
    mustChangePassword: boolean;
  };
};

/**
 * Liest und prüft die Session aus dem Cookie. Pro Request nur einmal (React cache).
 * Gibt null zurück, wenn keine gültige Session existiert.
 */
export const getCurrentSession = cache(async (): Promise<CurrentSession | null> => {
  const store = await cookies();
  const token = store.get(authConfig.cookieName)?.value;
  if (!token || token.length > 100) return null;

  const id = hashSessionToken(token);
  const db = getDb();
  const [row] = await db
    .select({
      sessionId: schema.sessions.id,
      createdAt: schema.sessions.createdAt,
      expiresAt: schema.sessions.expiresAt,
      memberId: schema.members.id,
      memberNo: schema.members.memberNo,
      firstName: schema.members.firstName,
      lastName: schema.members.lastName,
      mustChangePassword: schema.members.mustChangePassword,
    })
    .from(schema.sessions)
    .innerJoin(schema.members, eq(schema.members.id, schema.sessions.memberId))
    .where(eq(schema.sessions.id, id))
    .limit(1);

  const now = new Date();
  if (!row) return null;
  if (!isSessionValid(row, now)) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }

  const nextExpiry = slidingExpiry(row, now);
  if (nextExpiry) {
    await db
      .update(schema.sessions)
      .set({ expiresAt: nextExpiry })
      .where(eq(schema.sessions.id, id));
  }

  return {
    sessionId: row.sessionId,
    member: {
      id: row.memberId,
      memberNo: row.memberNo,
      firstName: row.firstName,
      lastName: row.lastName,
      mustChangePassword: row.mustChangePassword,
    },
  };
});

/** Löscht die aktuelle Session und das Cookie. */
export async function destroyCurrentSession(): Promise<number | null> {
  const store = await cookies();
  const token = store.get(authConfig.cookieName)?.value;
  store.delete(authConfig.cookieName);
  if (!token) return null;
  const id = hashSessionToken(token);
  const db = getDb();
  const [row] = await db
    .select({ memberId: schema.sessions.memberId })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, id));
  await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
  return row?.memberId ?? null;
}

/** Beendet alle anderen Sessions eines Mitglieds (z. B. nach Passwortwechsel). */
export async function deleteOtherSessions(memberId: number, keepSessionId: string) {
  await getDb()
    .delete(schema.sessions)
    .where(and(eq(schema.sessions.memberId, memberId), ne(schema.sessions.id, keepSessionId)));
}

/** Räumt abgelaufene Sessions eines Mitglieds auf (wird beim Login aufgerufen). */
export async function purgeExpiredSessions(memberId: number) {
  await getDb()
    .delete(schema.sessions)
    .where(and(eq(schema.sessions.memberId, memberId), lt(schema.sessions.expiresAt, new Date())));
}
