// Spielt alle Migrationen aus ./drizzle ein. Idempotent: bereits angewandte
// Migrationen werden über die Tabelle __drizzle_migrations übersprungen.
// Bewusst reines JavaScript mit Laufzeit-Abhängigkeiten, damit es auf Hostinger
// auch ohne devDependencies (tsx, drizzle-kit) läuft.
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}

const connection = await mysql.createConnection({ uri: url, multipleStatements: true });
await connection.query("SET time_zone = '+00:00'");
try {
  await migrate(drizzle(connection), {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  });
  console.log("Migrationen angewandt.");
} catch (error) {
  console.error("Migration fehlgeschlagen:", error);
  process.exitCode = 1;
} finally {
  await connection.end();
}
