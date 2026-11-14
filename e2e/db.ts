import mysql from "mysql2/promise";

/** Direkter DB-Zugriff für Testvorbereitung (Sperren zurücksetzen, Zustände prüfen). */
export async function withDb<T>(fn: (conn: mysql.Connection) => Promise<T>): Promise<T> {
  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL! });
  try {
    return await fn(conn);
  } finally {
    await conn.end();
  }
}

export async function resetMembers() {
  await withDb(async (c) => {
    await c.query("UPDATE members SET failed_logins = 0, locked_until = NULL");
    await c.query("DELETE FROM sessions");
    await c.query("DELETE FROM audit_log");
  });
}
