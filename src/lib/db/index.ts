import "server-only";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

export type Db = MySql2Database<typeof schema>;

const globalForDb = globalThis as unknown as { pool?: mysql.Pool; db?: Db };

/** Ist eine Datenbank konfiguriert? (Für /api/health und Builds ohne DB.) */
export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function getPool(): mysql.Pool {
  if (globalForDb.pool) return globalForDb.pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ist nicht gesetzt.");
  // DATE-Spalten als "YYYY-MM-DD"-Strings, damit keine Zeitzonen-Verschiebung entsteht.
  globalForDb.pool = mysql.createPool({
    uri: url,
    connectionLimit: 5,
    dateStrings: ["DATE"],
    timezone: "Z",
  });
  // DB-Sitzung auf UTC stellen, damit CURRENT_TIMESTAMP-Defaults und Vergleiche mit
  // JS-Dates (die mysql2 als UTC sendet) zusammenpassen, egal wie der Server eingestellt ist.
  globalForDb.pool.pool.on("connection", (conn) => {
    conn.query("SET time_zone = '+00:00'");
  });
  return globalForDb.pool;
}

/**
 * Liefert die Drizzle-Instanz. Der Pool wird beim ersten Aufruf erzeugt und im
 * Dev-Modus über Hot-Reloads hinweg wiederverwendet.
 */
export function getDb(): Db {
  globalForDb.db ??= drizzle(getPool(), { schema, mode: "default" });
  return globalForDb.db;
}

export async function pingDb(): Promise<boolean> {
  await getPool().query("SELECT 1");
  return true;
}

export { schema };
