// Legt ein Konto an oder setzt dessen Passwort zurück (Produktion, ohne Seed).
// Aufruf: node scripts/create-member.mjs <Mitgliedsnummer> <Vorname> <Nachname> [member|admin]
// Das Passwort kommt über stdin, damit es weder in der Prozessliste noch in Logs steht.
// Das Konto muss das Passwort beim ersten Login ändern.
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const [memberNo, firstName, lastName, role = "member"] = process.argv.slice(2);
if (!/^[A-Z0-9]{3,20}$/.test(memberNo ?? "") || !firstName || !lastName) {
  console.error("Aufruf: create-member.mjs <Mitgliedsnummer> <Vorname> <Nachname> [member|admin]");
  process.exit(1);
}
if (!["member", "admin"].includes(role)) {
  console.error("Rolle muss member oder admin sein.");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}

let password = "";
for await (const chunk of process.stdin) password += chunk;
password = password.replace(/\r?\n$/, "");
if (password.length < 10 || password.length > 128) {
  console.error("Passwort (stdin) muss 10 bis 128 Zeichen lang sein.");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
const connection = await mysql.createConnection({ uri: url });
try {
  await connection.query("SET time_zone = '+00:00'");
  const [result] = await connection.execute(
    `INSERT INTO members (member_no, first_name, last_name, password_hash, must_change_password, role)
     VALUES (?, ?, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), must_change_password = 1,
       role = VALUES(role), failed_logins = 0, locked_until = NULL`,
    [memberNo, firstName, lastName, hash, role],
  );
  // Bestehende Sessions des Kontos beenden, falls das Passwort zurückgesetzt wurde.
  await connection.execute(
    "DELETE s FROM sessions s JOIN members m ON m.id = s.member_id WHERE m.member_no = ?",
    [memberNo],
  );
  console.log(
    `${result.affectedRows === 1 ? "Angelegt" : "Zurückgesetzt"}: ${memberNo} (${role}), Passwortwechsel beim ersten Login.`,
  );
} finally {
  await connection.end();
}
