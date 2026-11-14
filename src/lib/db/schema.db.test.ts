import mysql, { type RowDataPacket } from "mysql2/promise";
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { seedResorts } from "../../../scripts/seed-data";

// Integrationstests für Migration und Seed (WP2) gegen eine echte MySQL-Datenbank.
// Voraussetzung: `npm run db:migrate && npm run db:seed` ist gelaufen.
// Jeder Test läuft in einer Transaktion, die zurückgerollt wird.

const url = process.env.DATABASE_URL;
let conn: mysql.Connection;

describe.skipIf(!url)("Datenbank-Schema", () => {
  beforeAll(async () => {
    conn = await mysql.createConnection({ uri: url!, dateStrings: true });
  });
  afterAll(async () => conn?.end());
  beforeEach(async () => conn.beginTransaction());
  afterEach(async () => conn.rollback());

  const q = async (sql: string, params: unknown[] = []) =>
    (await conn.query<RowDataPacket[]>(sql, params))[0];

  const insertMember = async (memberNo: string) => {
    const [res] = await conn.query<mysql.ResultSetHeader>(
      `INSERT INTO members (member_no, first_name, last_name, password_hash) VALUES (?, 'T', 'T', 'x')`,
      [memberNo],
    );
    return res.insertId;
  };

  it("hat alle Tabellen aus dem Plan", async () => {
    const rows = await q(
      `SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()`,
    );
    const tables = rows.map((r) => r.t);
    for (const t of [
      "members",
      "sessions",
      "resorts",
      "seasons",
      "feedback",
      "vacation_requests",
      "audit_log",
    ]) {
      expect(tables).toContain(t);
    }
  });

  it("nutzt utf8mb4, Umlaute und Emojis bleiben erhalten", async () => {
    const id = await insertMember("TDB0001");
    const text = "Grüße aus Österreich 🏔️";
    await conn.query(
      `INSERT INTO feedback (member_id, category, subject, message) VALUES (?, 'general', ?, ?)`,
      [id, text, text],
    );
    const [row] = await q(`SELECT subject FROM feedback WHERE member_id = ?`, [id]);
    expect(row.subject).toBe(text);
  });

  it("Seed ist idempotent: genau die Seed-Resorts mit je zwei Jahren Saisons", async () => {
    for (const r of seedResorts) {
      const rows = await q(
        `SELECT s.start_date FROM seasons s JOIN resorts r ON r.id = s.resort_id WHERE r.slug = ?`,
        [r.slug],
      );
      expect(rows).toHaveLength(r.seasons.length * 2);
      expect(new Set(rows.map((x) => x.start_date)).size).toBe(rows.length);
    }
    const members = await q(`SELECT member_no FROM members WHERE member_no LIKE 'M10000_'`);
    expect(members).toHaveLength(2);
  });

  it("Seed-Passwörter sind bcrypt-Hashes, keine Klartexte", async () => {
    const rows = await q(`SELECT password_hash FROM members WHERE member_no LIKE 'M10000_'`);
    for (const r of rows) expect(r.password_hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it("Mitgliedsnummer ist eindeutig", async () => {
    await insertMember("TDB0002");
    await expect(insertMember("TDB0002")).rejects.toThrow(/Duplicate/);
  });

  it("Löschen eines Mitglieds löscht seine Sessions (CASCADE)", async () => {
    const id = await insertMember("TDB0003");
    await conn.query(
      `INSERT INTO sessions (id, member_id, expires_at) VALUES (?, ?, UTC_TIMESTAMP())`,
      ["a".repeat(64), id],
    );
    await conn.query(`DELETE FROM members WHERE id = ?`, [id]);
    expect(await q(`SELECT id FROM sessions WHERE member_id = ?`, [id])).toHaveLength(0);
  });

  it("Resort mit Urlaubsanfragen kann nicht gelöscht werden (RESTRICT)", async () => {
    const id = await insertMember("TDB0004");
    const [resort] = await q(`SELECT id FROM resorts LIMIT 1`);
    await conn.query(
      `INSERT INTO vacation_requests (member_id, resort_id, start_date, end_date, guests)
       VALUES (?, ?, '2030-01-01', '2030-01-05', 2)`,
      [id, resort.id],
    );
    await expect(conn.query(`DELETE FROM resorts WHERE id = ?`, [resort.id])).rejects.toThrow(
      /foreign key/i,
    );
  });

  it("ungültige Enum-Werte werden abgelehnt (Strict Mode)", async () => {
    const id = await insertMember("TDB0005");
    await expect(
      conn.query(
        `INSERT INTO feedback (member_id, category, subject, message) VALUES (?, 'hack', 's', 'm')`,
        [id],
      ),
    ).rejects.toThrow();
  });
});
