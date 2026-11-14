# Neubau-Plan: Resort-Mitgliederverwaltung

Stand: 14.11.2026 · Status: Entwurf zur Freigabe

## 1. Ziel

Die Mitglieder-Web-App wird von Grund auf neu gebaut und muss auf **Hostinger** (Cloud Hosting) deploybar sein. Funktionsumfang:

1. Login mit **Mitgliedsnummer** und Passwort
2. Resort-Details ansehen, inklusive **Saisons** und weiterer Informationen
3. Feedback absenden
4. Adresse ändern und Passwort ändern
5. Urlaub anfragen

## 2. Befund zum bestehenden Code

Der aktuelle Stand (`backend/`, `frontend/`, `schema.sql`) ist ein Prototyp und wird **nicht** weiterverwendet. Übernommen werden nur die fachlichen Ideen.

| Bereich           | Befund                                                                                                                                                                                                                             | Schwere               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Authentifizierung | Nach dem Login wird nur die Mitglieds-ID in `localStorage` gespeichert und als Header `x-member-id` mitgeschickt. Der Server prüft nichts weiter: **jeder kann sich als beliebiges Mitglied ausgeben**, indem er den Header setzt. | Kritisch              |
| Passwörter        | bcrypt ist eingebaut, aber Altbestand liegt im Klartext vor und wird erst beim Login migriert. Passwortänderung verlangt nicht das alte Passwort.                                                                                  | Hoch                  |
| Saisons           | `vacation_requests.season_id` existiert, aber es gibt **keine Tabelle `seasons`** und keine Anzeige von Saisons. Anforderung 2 ist nicht umgesetzt.                                                                                | Hoch                  |
| Validierung       | Keine Eingabeprüfung (Datumsbereich, Pflichtfelder, Längen), kein Rate-Limiting, kein CSRF-Schutz.                                                                                                                                 | Hoch                  |
| Datenbank         | PostgreSQL. Auf Hostinger Shared/Cloud Hosting gibt es nur **MySQL/MariaDB**.                                                                                                                                                      | Blocker für Hostinger |
| Aufbau            | Custom-Express-Server um Next.js 13 (`dir: '../frontend'` ist relativ zum Arbeitsverzeichnis und bricht je nach Startort). Kein Build-Skript, keine Tests, kein TypeScript.                                                        | Mittel                |
| UI                | Unformatierte Rohformulare, Resort- und Saison-ID müssen von Hand eingetippt werden, keine Navigation, kein Logout.                                                                                                                | Mittel                |

Was wir fachlich übernehmen: die vier Kern-Entitäten (Mitglied, Resort, Feedback, Urlaubsanfrage), Login per Mitgliedsnummer, bcrypt-kompatible Hashes und die automatische Migration von Klartext-Passwörtern beim ersten Login (siehe 6.3).

## 3. Hosting-Entscheidung

| Hostinger-Angebot                                   | Node.js                                                            | Datenbank     | Bewertung                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------ |
| Web-/Business-Hosting                               | Node.js-Apps ab Business-Plan (Next.js, Express; Node 18/20/22/24) | MySQL/MariaDB | Möglich, aber knappe Ressourcen                                          |
| **Cloud Hosting** (Startup/Professional/Enterprise) | Ja, gleiche Node.js-App-Funktion, mehr RAM/CPU                     | MySQL/MariaDB | **Empfehlung**                                                           |
| VPS                                                 | Alles (Docker, PostgreSQL)                                         | frei wählbar  | Mehr Kontrolle, aber Server-Pflege (Updates, Backups, TLS) liegt bei uns |

**Empfehlung: Hostinger Cloud Hosting mit Node.js-App + MySQL.** Das entspricht dem Wunsch „Cloud auf Hostinger“, Hostinger übernimmt TLS, Backups und Betriebssystem. Der Build läuft bei Hostinger aus einem Git-Repository oder einem Zip-Archiv; die App wird mit `npm run build` gebaut und mit `npm start` gestartet.

Konsequenzen für den Stack:

- **MySQL statt PostgreSQL.**
- **Keine nativen Node-Module**, die beim Build kompiliert werden müssen (z. B. `bcrypt`). Wir nehmen rein-JavaScript-Pakete (`bcryptjs`), damit der Hostinger-Build nicht scheitert.
- Ein einziger Node-Prozess (kein separater API-Server), damit es zum Hostinger-Modell „eine Node.js-App pro Website“ passt.

Falls später PostgreSQL, Hintergrundjobs oder mehrere Dienste nötig werden, ist ein Umzug auf einen Hostinger-VPS mit Docker möglich, ohne den Code umzubauen (nur Datenbanktreiber und Deployment ändern sich).

## 4. Stack

| Schicht            | Wahl                                          | Begründung                                                                                                                |
| ------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Framework          | **Next.js 15 (App Router) + TypeScript**      | Frontend und Backend in einer App; von Hostinger als App-Typ erkannt                                                      |
| UI                 | Tailwind CSS + shadcn/ui-Komponenten          | Schnell, responsiv, barrierearm                                                                                           |
| Datenbank          | **MySQL 8 / MariaDB** (Hostinger)             | Einzige DB auf Cloud Hosting                                                                                              |
| ORM / Migrationen  | **Drizzle ORM** + `drizzle-kit` + `mysql2`    | Reines JS, keine Binär-Engine (Prisma-Engines machen auf Shared Hosting oft Probleme), typsicher, SQL-Migrationen im Repo |
| Validierung        | Zod                                           | Gleiche Schemas für Formulare und Server                                                                                  |
| Passwort-Hashing   | `bcryptjs`, Kostenfaktor 12                   | Kompatibel mit bestehenden `$2b$`-Hashes, kein nativer Build                                                              |
| Sessions           | Eigene DB-Sessions mit httpOnly-Cookie        | Serverseitig widerrufbar (Logout, Passwortwechsel)                                                                        |
| E-Mail (optional)  | SMTP über Hostinger-Mail mit `nodemailer`     | Bestätigung von Urlaubsanfragen / Feedback                                                                                |
| Tests              | Vitest (Unit), Playwright (E2E)               |                                                                                                                           |
| CI                 | GitHub Actions: Lint, Typecheck, Tests, Build |                                                                                                                           |
| Lokale Entwicklung | `docker compose` mit MySQL 8                  | Gleiche DB wie in Produktion                                                                                              |

## 5. Architektur

```
Browser
  │  HTTPS (Hostinger TLS)
  ▼
Next.js-App (ein Node-Prozess auf Hostinger)
  ├─ middleware.ts         → schützt alle Seiten außer /login
  ├─ app/(public)/login    → Login-Formular (Server Action)
  ├─ app/(member)/...      → Dashboard, Resorts, Feedback, Profil, Urlaub
  ├─ lib/auth/*            → Session, Hashing, Rate-Limit
  ├─ lib/db/*              → Drizzle-Schema, Client, Queries
  └─ lib/validation/*      → Zod-Schemas
  ▼
MySQL (Hostinger)
```

Prinzipien:

- **Server Actions und Server Components** greifen direkt auf die DB zu. Es gibt keine öffentliche JSON-API, die man absichern müsste. Next.js prüft bei Server Actions den Origin (CSRF-Schutz).
- Die **Mitglieds-ID kommt nie vom Client**, sondern immer aus der Session.
- Jede Mutation: Session prüfen → Zod validieren → DB schreiben → `revalidatePath`.
- Konfiguration ausschließlich über Umgebungsvariablen (`DATABASE_URL`, `SESSION_SECRET`, `SMTP_*`), die im Hostinger-hPanel gesetzt werden.

### Seiten

| Route             | Inhalt                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `/login`          | Mitgliedsnummer + Passwort, Fehlermeldung ohne Hinweis, ob die Nummer existiert                |
| `/` (Dashboard)   | Begrüßung, offene Urlaubsanfragen, Schnellzugriffe                                             |
| `/resorts`        | Liste aller Resorts (Karte mit Bild, Ort, Kurzbeschreibung)                                    |
| `/resorts/[slug]` | Details, Ausstattung, Kontakt, **Saisonkalender** (Haupt-, Neben-, Nebensaison mit Zeiträumen) |
| `/urlaub`         | Eigene Anfragen mit Status; „Neue Anfrage“                                                     |
| `/urlaub/neu`     | Resort wählen → Zeitraum wählen → Saison wird automatisch ermittelt → Personenzahl, Bemerkung  |
| `/feedback`       | Formular (Kategorie, optional Resort, Betreff, Text) und Liste eigener Feedbacks               |
| `/profil`         | Adresse ändern; Passwort ändern (altes Passwort erforderlich)                                  |

## 6. Datenmodell (MySQL)

```sql
members
  id                INT PK AUTO_INCREMENT
  member_no         VARCHAR(20) UNIQUE NOT NULL   -- Login-Kennung
  first_name, last_name VARCHAR(100)
  email             VARCHAR(255) NULL
  password_hash     VARCHAR(255) NOT NULL
  must_change_password BOOLEAN DEFAULT FALSE
  street, postal_code, city, country  VARCHAR(...)
  failed_logins     INT DEFAULT 0
  locked_until      DATETIME NULL
  created_at, updated_at DATETIME

sessions
  id                CHAR(64) PK      -- SHA-256 des Cookie-Tokens
  member_id         INT FK → members ON DELETE CASCADE
  expires_at        DATETIME
  created_at        DATETIME
  user_agent        VARCHAR(255) NULL

resorts
  id, slug UNIQUE, name, location, country
  description TEXT, amenities JSON, check_in_time, check_out_time
  contact_phone, contact_email, image_url
  active BOOLEAN

seasons
  id, resort_id FK → resorts
  name VARCHAR(50)                  -- z. B. "Hauptsaison Sommer"
  type ENUM('peak','high','low')
  start_date DATE, end_date DATE
  INDEX (resort_id, start_date)

feedback
  id, member_id FK, resort_id FK NULL
  category ENUM('general','resort','booking','website','other')
  subject VARCHAR(150), message TEXT
  status ENUM('new','read','answered') DEFAULT 'new'
  created_at

vacation_requests
  id, member_id FK, resort_id FK, season_id FK NULL
  start_date DATE, end_date DATE, guests TINYINT
  note TEXT NULL
  status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending'
  created_at, updated_at
  INDEX (member_id, created_at)

audit_log
  id, member_id NULL, action VARCHAR(50), ip VARCHAR(45), created_at
```

Geschäftsregeln für Urlaubsanfragen:

- `start_date < end_date`, Start nicht in der Vergangenheit, Dauer 1–28 Nächte (konfigurierbar).
- Die Saison wird serverseitig aus Resort + Startdatum ermittelt, nicht vom Client übernommen.
- Ein Mitglied kann keine zwei überlappenden offenen Anfragen haben.
- Nur Anfragen im Status `pending` können vom Mitglied storniert werden.

## 7. Sicherheit

1. **Passwörter:** bcryptjs, Kosten 12. Mindestlänge 10 Zeichen, Prüfung gegen eine Liste häufiger Passwörter.
2. **Altbestand:** Klartext-Passwörter werden beim Import entweder sofort gehasht (bevorzugt) oder beim ersten Login migriert; in beiden Fällen wird `must_change_password` gesetzt.
3. **Sessions:** 32 Byte Zufallstoken im Cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, Pfad `/`), in der DB nur der SHA-256-Hash. Laufzeit 7 Tage gleitend, Ablauf absolut nach 30 Tagen. Bei Passwortwechsel werden alle anderen Sessions gelöscht.
4. **Brute-Force-Schutz:** Nach 5 Fehlversuchen wird das Konto 15 Minuten gesperrt, zusätzlich Limit pro IP (in der DB, weil es keinen Redis gibt).
5. **Fehlermeldungen:** Einheitlich „Mitgliedsnummer oder Passwort falsch“; konstante Laufzeit auch bei unbekannter Nummer (Dummy-Hash vergleichen).
6. **Autorisierung:** Jede Query filtert nach `member_id` aus der Session.
7. **Header:** CSP, `X-Frame-Options: DENY`, `Referrer-Policy`, HSTS über `next.config` bzw. `.htaccess`.
8. **Eingaben:** Zod auf jeder Server Action, Längenbegrenzungen, React escaped Ausgaben.
9. **Logging:** Login-Erfolg/-Fehlschlag, Passwortwechsel, Adressänderung im `audit_log` (ohne Passwörter).
10. **DSGVO:** Datenschutzhinweis und Impressum als statische Seiten; Adressdaten nur für das eigene Mitglied sichtbar.

## 8. Deployment auf Hostinger

Einmalig im hPanel:

1. Cloud-Hosting-Plan und Domain/Subdomain wählen (z. B. `mitglieder.<domain>`).
2. **MySQL-Datenbank anlegen** (Name, Benutzer, Passwort notieren). Für Migrationen von außen „Remote MySQL“ für die CI-IP freigeben, oder Migrationen beim App-Start laufen lassen (siehe unten).
3. **Node.js-App anlegen:** Quelle = GitHub-Repository `ibenali/resorts-memebers-management`, Branch `main`, Node 22, App-Typ Next.js, Build `npm run build`, Start `npm start`.
4. Umgebungsvariablen setzen: `DATABASE_URL=mysql://user:pass@localhost:3306/dbname`, `SESSION_SECRET`, `NODE_ENV=production`, optional `SMTP_*`.
5. SSL aktivieren (kostenlos im hPanel).

Laufender Betrieb:

- Push auf `main` → Hostinger baut automatisch neu (Git-Deploy). Alternativ manueller Build aus Zip über die Hostinger-API.
- **Migrationen:** `npm run db:migrate` (drizzle-kit) läuft als Teil von `npm start` vor dem Server-Start (`prestart`-Skript), idempotent.
- **Seed:** `npm run db:seed` einmalig für Resorts, Saisons und Test-Mitglieder (nur Staging).
- Backups: Hostinger-Tagesbackups plus wöchentlicher `mysqldump` über hPanel-Cron.
- Health-Check: `/api/health` gibt DB-Status zurück.

Achtung: Ein Hostinger-Build überschreibt das gesamte Website-Verzeichnis. Die App sollte daher auf einer eigenen (Sub-)Domain laufen.

## 9. Arbeitspakete

Jedes Paket ist einzeln umsetzbar, endet in einem eigenen PR und kann ein eigener Thread werden.

| #        | Paket                                                    | Abhängig von                    | Ergebnis („fertig wenn…“)                                                                                                                                                                                                        |
| -------- | -------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WP1**  | **Projekt-Grundgerüst**                                  | –                               | Alter Code entfernt (bleibt in Git-Historie); Next.js 15 + TS + Tailwind + ESLint/Prettier + Vitest; `docker-compose.yml` mit MySQL; GitHub-Actions-CI (Lint, Typecheck, Test, Build) grün; Layout mit Navigation; `/api/health` |
| **WP2**  | **Datenbank-Schema & Seed**                              | WP1                             | Drizzle-Schema aller Tabellen aus Kap. 6, erste Migration, Seed-Skript (3 Resorts mit Saisons, 2 Test-Mitglieder), `db:migrate`/`db:seed`-Skripte, Doku in README                                                                |
| **WP3**  | **Login & Sessions**                                     | WP2                             | Login per Mitgliedsnummer, Logout, DB-Sessions, `middleware.ts`-Schutz, Sperre nach Fehlversuchen, Audit-Log, erzwungener Passwortwechsel bei `must_change_password`; Unit- und E2E-Tests                                        |
| **WP4**  | **Resorts & Saisons**                                    | WP3                             | `/resorts` und `/resorts/[slug]` mit Ausstattung, Kontakt und Saisonkalender; responsiv                                                                                                                                          |
| **WP5**  | **Feedback**                                             | WP3                             | Formular mit Kategorie/Resort, Validierung, Liste eigener Feedbacks, optional Bestätigungs-Mail                                                                                                                                  |
| **WP6**  | **Profil: Adresse & Passwort**                           | WP3                             | Adresse ändern (strukturierte Felder), Passwort ändern mit altem Passwort und Richtlinie, andere Sessions werden beendet                                                                                                         |
| **WP7**  | **Urlaubsanfragen**                                      | WP3, WP4                        | Anfrage-Assistent (Resort, Zeitraum, Personen), serverseitige Saisonermittlung, Regeln aus Kap. 6, eigene Anfragen mit Status, Stornieren                                                                                        |
| **WP8**  | **Hostinger-Deployment**                                 | WP1 (Start), final nach WP3–WP7 | Staging- und Produktions-App im hPanel, DB angelegt, Env-Variablen gesetzt, Git-Auto-Deploy, Migration beim Start, Deploy-Anleitung `docs/DEPLOYMENT.md`, Smoke-Test                                                             |
| **WP9**  | **Datenübernahme Altbestand** (optional)                 | WP2                             | Import-Skript CSV/Postgres → MySQL, Klartext-Passwörter werden gehasht, Bericht über übernommene Datensätze                                                                                                                      |
| **WP10** | **Admin-Bereich** (optional, nicht in den Anforderungen) | WP3                             | Rolle `admin`; Resorts/Saisons pflegen, Urlaubsanfragen genehmigen/ablehnen, Feedback lesen                                                                                                                                      |

Reihenfolge und Parallelisierung:

```
WP1 ──► WP2 ──► WP3 ──┬──► WP4 ──► WP7
  │                   ├──► WP5
  │                   └──► WP6
  └──► WP8 (früh mit „Hello World“ auf Staging, final nach WP4–WP7)
WP9 und WP10 nach Bedarf
```

WP4, WP5 und WP6 können nach WP3 gleichzeitig laufen. WP8 sollte früh starten, damit Hostinger-Eigenheiten (Build, Env, DB-Zugang) sichtbar werden, bevor die Features fertig sind.

## 10. Offene Fragen

1. Welcher Hostinger-Plan ist vorhanden oder geplant (Business, Cloud Startup, VPS)? Und welche Domain/Subdomain?
2. Sprache der Oberfläche: nur Deutsch, oder Deutsch und Englisch?
3. Gibt es echte Mitgliederdaten aus einem Altsystem, die übernommen werden müssen (WP9)?
4. Wer bearbeitet Urlaubsanfragen und Feedback: braucht es den Admin-Bereich (WP10), oder reicht eine E-Mail an das Resort-Team?
5. Wie bekommen Mitglieder ihr Erstpasswort, und braucht es „Passwort vergessen“ per E-Mail?
6. Gibt es Branding (Logo, Farben) für „Sterling Resorts“?
