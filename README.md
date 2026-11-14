# Resort-Mitgliederportal

Web-App für Resort-Mitglieder: Login per Mitgliedsnummer, Resorts und Saisons ansehen,
Feedback senden, Adresse und Passwort ändern, Urlaub anfragen.

Stack: Next.js 15 (App Router, TypeScript), Tailwind CSS 4, MySQL 8 (Drizzle ORM),
betrieben auf einem **Hostinger-VPS** mit Docker unter https://resort.ieb-digital.com.

Dokumentation: [docs/README.md](docs/README.md), insbesondere
[Projektbericht](docs/PROJEKTBERICHT.md), [Notizen zum Weiterarbeiten](docs/NOTIZEN.md) und
[Deployment](docs/DEPLOYMENT.md).

## Lokale Entwicklung

Voraussetzungen: Node.js 22 (siehe `.nvmrc`), Docker.

```bash
cp .env.example .env
docker compose up -d mysql
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Die App läuft dann unter http://localhost:3000, der Health-Check unter
http://localhost:3000/api/health.

## Skripte

| Befehl                        | Zweck                       |
| ----------------------------- | --------------------------- |
| `npm run dev`                 | Entwicklungsserver          |
| `npm run build` / `npm start` | Produktions-Build und Start |
| `npm run lint`                | ESLint                      |
| `npm run typecheck`           | TypeScript-Prüfung          |
| `npm test`                    | Unit-Tests (Vitest)         |
| `npm run format`              | Prettier                    |

## Datenbank

MySQL 8 / MariaDB, Schema in `src/lib/db/schema.ts`, Migrationen als SQL in `drizzle/`.
Tabellen: `members`, `sessions`, `resorts`, `seasons`, `feedback`, `vacation_requests`, `audit_log`.

Schema ändern: `schema.ts` anpassen, `npm run db:generate -- --name <beschreibung>`,
die erzeugte SQL-Datei prüfen und mit committen.

### Test-Zugänge (nur Entwicklung/Staging)

Nach `npm run db:seed`:

| Mitgliedsnummer | Passwort            | Hinweis                                |
| --------------- | ------------------- | -------------------------------------- |
| `M100001`       | `Urlaub-2026-Test`  | normales Konto                         |
| `M100002`       | `Erstpasswort-2026` | muss Passwort beim ersten Login ändern |

Der Seed verweigert `NODE_ENV=production`, außer mit `ALLOW_SEED=1`. Bestehende Test-Konten
werden nicht überschrieben; `SEED_RESET_PASSWORDS=1` setzt sie auf den Seed-Stand zurück.

Alle Zeitstempel in der Datenbank sind UTC (jede Verbindung setzt `time_zone = '+00:00'`).

## Anmeldung und Sessions

- Login mit Mitgliedsnummer und Passwort (`/login`), Logout im Kopfbereich.
- Sessions liegen in der Tabelle `sessions` (nur SHA-256 des Cookie-Tokens), Cookie `session`
  ist `HttpOnly`, `SameSite=Lax` und in Produktion `Secure`. Laufzeit 7 Tage gleitend, maximal 30 Tage.
- Nach 5 Fehlversuchen ist das Konto 15 Minuten gesperrt; zusätzlich max. 20 Fehlversuche
  pro IP in 15 Minuten. Alle Anmeldeereignisse landen in `audit_log`.
- Konten mit `must_change_password` landen nach dem Login auf `/passwort-aendern`.
- `src/middleware.ts` leitet ohne Cookie zum Login. Die echte Prüfung macht
  `requireMember()` aus `src/lib/auth/guard.ts`: **jede neue Seite und Server Action unter
  `(member)` muss es selbst aufrufen** und Daten nur mit `member.id` aus der Session laden.
- Die Client-IP wird nur mit `TRUST_PROXY=1` aus `X-Forwarded-For` (letzter Eintrag, genau ein
  Reverse Proxy davor) gelesen. Setzen Sie das nur, wenn die App ausschließlich über den Proxy
  erreichbar ist. Ohne die Variable greift das IP-Limit nicht, die Kontosperre schon.
- `COOKIE_SECURE=false` schaltet `Secure` ab, falls die App ohne HTTPS getestet wird.

## Verwaltung (Admin)

Mitglieder mit `role = 'admin'` sehen im Kopfbereich „Verwaltung“ (`/admin`):

- Urlaubsanfragen bestätigen oder ablehnen (nur Status „In Prüfung“)
- Feedback lesen, als gelesen/beantwortet markieren, per E-Mail antworten
- Resorts anlegen, bearbeiten, deaktivieren; Saisons hinzufügen (ohne Überschneidung) und löschen

Für alle anderen liefert `/admin` eine 404-Seite. Jede Admin-Seite und -Action ruft
`requireAdmin()` selbst auf, alle Änderungen landen im `audit_log` (`admin_*`).
Einen Admin anlegen: `UPDATE members SET role = 'admin' WHERE member_no = '…';`

## Sprache

Die Oberfläche ist deutsch. Alle Texte liegen in `src/lib/i18n/de.ts`, damit weitere
Sprachen später ergänzt werden können.
