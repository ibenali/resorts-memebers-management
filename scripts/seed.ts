// Füllt die Datenbank mit Beispiel-Resorts, Saisons und Test-Mitgliedern.
// Idempotent: vorhandene Resorts/Mitglieder werden über slug bzw. member_no
// aktualisiert, Saisons der Seed-Resorts werden neu geschrieben.
import bcrypt from "bcryptjs";
import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../src/lib/db/schema";
import { expandSeasons, seedMembers, seedResorts } from "./seed-data";

const BCRYPT_COST = 12;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ist nicht gesetzt.");
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "1") {
    throw new Error("Seed in Produktion verweigert. Zum Erzwingen ALLOW_SEED=1 setzen.");
  }

  const connection = await mysql.createConnection({ uri: url, timezone: "Z" });
  await connection.query("SET time_zone = '+00:00'");
  const resetPasswords = process.env.SEED_RESET_PASSWORDS === "1";
  const db = drizzle(connection, { schema, mode: "default" });

  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear + 1];

  try {
    await db.transaction(async (tx) => {
      for (const r of seedResorts) {
        const { seasons: seasonDefs, ...resort } = r;
        await tx
          .insert(schema.resorts)
          .values(resort)
          .onDuplicateKeyUpdate({ set: { ...resort, slug: undefined } });
        const [row] = await tx
          .select({ id: schema.resorts.id })
          .from(schema.resorts)
          .where(eq(schema.resorts.slug, r.slug));
        await tx.delete(schema.seasons).where(eq(schema.seasons.resortId, row.id));
        await tx
          .insert(schema.seasons)
          .values(expandSeasons(seasonDefs, years).map((s) => ({ ...s, resortId: row.id })));
      }

      for (const m of seedMembers) {
        const { password, ...member } = m;
        const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
        const values = { ...member, passwordHash, failedLogins: 0, lockedUntil: null };
        // Vorhandene Test-Konten bleiben unverändert (z. B. ein geändertes Passwort),
        // außer SEED_RESET_PASSWORDS=1 setzt sie auf den Seed-Stand zurück.
        await tx
          .insert(schema.members)
          .values(values)
          .onDuplicateKeyUpdate({
            set: resetPasswords
              ? { ...values, memberNo: undefined }
              : { memberNo: sql`${schema.members.memberNo}` },
          });
      }
    });

    const resortCount = await db
      .select({ id: schema.resorts.id })
      .from(schema.resorts)
      .where(
        inArray(
          schema.resorts.slug,
          seedResorts.map((r) => r.slug),
        ),
      );
    console.log(
      `Seed fertig: ${resortCount.length} Resorts mit Saisons für ${years.join("/")}, ${seedMembers.length} Test-Konten (inkl. Admin).`,
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
