# Projektbericht: Neubau Resort-Mitgliederportal

Stand: 14.11.2026 · Produktion: https://resort.ieb-digital.com · Repository: `ibenali/resorts-memebers-management`

Dieser Bericht fasst zusammen, was gebaut wurde, wie und warum. Für die tägliche Arbeit
(lokal starten, deployen, Konten anlegen, nächste Schritte) siehe [NOTIZEN.md](NOTIZEN.md).

## 1. Ziel und Anforderungen

Die bestehende Mitglieder-App sollte von Grund auf neu gebaut und in der Cloud bei Hostinger
betrieben werden. Fachliche Anforderungen:

| #   | Anforderung                                                      | Umsetzung                           |
| --- | ---------------------------------------------------------------- | ----------------------------------- |
| 1   | Login mit Mitgliedsnummer und Passwort                           | WP3, `/login`                       |
| 2   | Resort-Details mit Saisons und weiteren Informationen            | WP4, `/resorts`, `/resorts/[slug]`  |
| 3   | Feedback absenden                                                | WP5, `/feedback`                    |
| 4   | Adresse ändern und Passwort ändern                               | WP6, `/profil`, `/passwort-aendern` |
| 5   | Urlaub anfragen                                                  | WP7, `/urlaub`, `/urlaub/neu`       |
| –   | Verwaltungsbereich (vom Nutzer nachträglich als nötig bestätigt) | WP10, `/admin`                      |

Alle sechs Punkte sind umgesetzt, getestet und in Produktion.

## 2. Ausgangslage

Der alte Stand (`backend/`, `frontend/`, `schema.sql`, PRs #1, #2, #4 aus 2025) war ein
Prototyp mit einer kritischen Lücke: Der Server vertraute einem Header `x-member-id`, jeder
konnte sich also als beliebiges Mitglied ausgeben. Außerdem fehlten Saisons, Validierung und
Rate-Limiting, und die Datenbank war PostgreSQL. Der Code wurde in WP1 entfernt (bleibt in der
Git-Historie), übernommen wurden nur die fachlichen Ideen. Details: [PLAN.md, Kap. 2](PLAN.md).

## 3. Architektur und Stack

| Schicht     | Wahl                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------- |
| Framework   | Next.js 15 (App Router, Server Components, Server Actions), TypeScript 5                     |
| UI          | Tailwind CSS 4, Texte zentral in `src/lib/i18n/de.ts`                                        |
| Datenbank   | MySQL 8.4, Drizzle ORM + `mysql2`, SQL-Migrationen in `drizzle/`                             |
| Validierung | Zod, dieselben Schemas für Formulare und Server                                              |
| Passwörter  | `bcryptjs`, Kosten 12, Mindestlänge 10, Liste häufiger Passwörter                            |
| Sessions    | eigene DB-Sessions, Cookie `session` (HttpOnly, Secure, SameSite=Lax), in der DB nur SHA-256 |
| Tests       | Vitest (Unit), Vitest gegen MySQL (`test:db`), Playwright (E2E)                              |
| CI/CD       | GitHub Actions: CI → Deploy auf den VPS                                                      |
| Betrieb     | Hostinger-VPS, Docker Compose, Caddy (HTTPS)                                                 |

```
Browser ──HTTPS──► Caddy (quick-translator, Ports 80/443)
                     │ Docker-Netz "edge"
                     ▼
                   app (Next.js standalone, :3000; Host nur 127.0.0.1:3100)
                     │
                     ▼
                   db (MySQL 8.4, Daten in /opt/resort-members/data/mysql)
```

Grundsätze:

- Es gibt keine öffentliche JSON-API. Seiten und Server Actions greifen direkt auf die DB zu;
  Next.js prüft bei Server Actions den Origin (CSRF-Schutz).
- Die Mitglieds-ID kommt nie vom Client, sondern immer aus der Session. Jede Seite und Action
  unter `(member)` ruft `requireMember()` selbst auf, jede Admin-Seite/-Action `requireAdmin()`
  (Nicht-Admins bekommen 404). `src/middleware.ts` leitet nur ohne Cookie zum Login.
- Jede Mutation: Session prüfen → Zod validieren → schreiben → `revalidatePath`. Sicherheitsrelevante
  Ereignisse landen in `audit_log`.
- Alle Zeitstempel sind UTC (jede DB-Verbindung setzt `time_zone = '+00:00'`).

Tabellen: `members` (inkl. `role`), `sessions`, `resorts`, `seasons`, `feedback`,
`vacation_requests`, `audit_log`. Migrationen: `0000_init.sql`, `0001_admin_role.sql`.

### Abweichung vom ursprünglichen Plan

[PLAN.md](PLAN.md) empfahl Hostinger **Cloud Hosting** (Node.js-App im hPanel). Beim Deployment
zeigte sich, dass der Nutzer bereits einen Hostinger-**VPS** besitzt, auf dem quick-translator
läuft. Der Nutzer entschied sich für diesen VPS. Weil der Code von Anfang an ohne native Module
und als einzelner Node-Prozess gebaut war, musste nur das Deployment angepasst werden
(Docker statt hPanel). MySQL wurde beibehalten.

## 4. Arbeitspakete

| WP   | Inhalt                                                                                          | PR           |
| ---- | ----------------------------------------------------------------------------------------------- | ------------ |
| Plan | Neubau-Plan, Befund, Stack, Arbeitspakete                                                       | #5           |
| WP1  | Grundgerüst: Next.js 15, Tailwind, ESLint/Prettier, Vitest, CI, `/api/health`                   | #6           |
| WP2  | Drizzle-Schema, Migration, Seed (3 Resorts mit Saisons, Testkonten), `db:migrate` als reines JS | #7           |
| WP3  | Login, Logout, DB-Sessions, Kontosperre, IP-Limit, Audit-Log, erzwungener Passwortwechsel       | #8           |
| WP4  | Resortliste und -detail mit Ausstattung, Kontakt, Saisonkalender (aktuelle Saison markiert)     | #10          |
| WP5  | Feedback mit Kategorie und optionalem Resort, eigene Liste, Limit 10 pro Stunde                 | #11          |
| WP6  | Adresse ändern, Passwort ändern (altes Passwort nötig, andere Sessions werden beendet)          | #12          |
| WP7  | Urlaubsanfragen: Saison serverseitig, 1–28 Nächte, keine Überschneidung, Stornieren             | #13          |
| WP8  | Deployment auf den Hostinger-VPS (Dockerfile, Compose, `deploy.sh`, Workflow)                   | #14          |
| WP10 | Verwaltung: Urlaub bestätigen/ablehnen, Feedback-Status, Resorts und Saisons pflegen            | #16          |
| Fix  | Migrationen laufen bei jedem Deploy; Workflow „Konto anlegen“                                   | #18          |
| QA   | Sicherheit, DB, Testfallkatalog / Features / Admin                                              | #9, #15, #17 |

WP9 (Datenübernahme aus dem Altsystem) ist offen, siehe [NOTIZEN.md](NOTIZEN.md#offene-punkte-und-nächste-schritte).

Die Feature-PRs wurden als Kette gestapelt (WP1 → WP2 → WP3 → WP4 → WP5 → WP6 → WP7 → WP10).
Korrekturen kamen in den untersten betroffenen Branch und wurden per Merge-Commit nach oben
weitergereicht (kein Force-Push). Alle PRs #5–#18 sind mit Merge-Commits auf `main`.

## 5. Vorgehen und Rollen

Die Arbeit lief in getrennten Threads mit klaren Rollen:

| Rolle       | Aufgabe                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Architektur | Befund zum Altcode, Hosting- und Stack-Entscheidung, Plan und Arbeitspakete ([PLAN.md](PLAN.md))          |
| Umsetzung   | WP1–WP7 und WP10 als gestapelte PRs, je mit Unit- und E2E-Tests                                           |
| QA          | unabhängige Tests gegen die Anforderungen ([TESTCASES.md](TESTCASES.md)), eigene Specs `e2e/qa-*.spec.ts` |
| Deployment  | WP8: VPS, Docker, Caddy, GitHub Actions, Domain ([DEPLOYMENT.md](DEPLOYMENT.md))                          |
| Review      | Prüfung aller PRs vor dem Merge, Merge-Reihenfolge, Nachbesserungen                                       |

Entscheidungen des Nutzers (14.11.2026): Admin-Bereich wird gebraucht; Oberfläche jetzt Deutsch,
Englisch und Französisch später; Betrieb auf dem vorhandenen VPS; Domain `resort.ieb-digital.com`;
geprüfte PRs werden gemergt.

## 6. QA-Befunde und Korrekturen

| Befund                                                                                          | Wo gefunden               | Korrektur                                                                            |
| ----------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| IP-Limit ließ sich mit gefälschtem `X-Forwarded-For` umgehen                                    | QA #9                     | WP3: XFF wird nur mit `TRUST_PROXY=1` ausgewertet (letzter Eintrag, genau ein Proxy) |
| Zeitstempel aus der DB-Uhr wichen von UTC ab                                                    | QA #9                     | WP2: `time_zone = '+00:00'` pro Verbindung, MySQL-Container in UTC                   |
| Hinter Caddy war das IP-Limit aus, weil `TRUST_PROXY` fehlte                                    | Review                    | WP8 (Commit e95adad): `deploy.sh` ergänzt `TRUST_PROXY=1` in der Server-Umgebung     |
| Produktions-DB ohne Tabellen: das `migrate`-Image wurde nie neu gebaut (Compose-Profil `tools`) | Deploy-Log nach dem Merge | #18: `docker compose --profile tools build` bei jedem Deploy                         |
| E2E-Hilfe setzte Passwort-Hash mit falschem Kostenfaktor zurück                                 | Umsetzung                 | WP6: Hash mit Kosten 12 wiederherstellen                                             |

In WP5, WP6, WP7 und WP10 fand die QA keine Fehler. Geprüft wurden u. a. serverseitige Validierung
bei abgeschalteter Browser-Prüfung, untergeschobene Felder (`memberId`, `seasonId`, `status`, `role`),
XSS, IDOR beim Stornieren, gleichzeitige überlappende Anfragen und das direkte Wiederabspielen
echter Admin-Server-Actions mit Mitglieds- und ohne Session.

Testumfang zum Abschluss: 56 Unit-Tests, 8 DB-Tests, 35 E2E-Tests (2 weitere laufen nur hinter dem Proxy).
Die CI führt Migration und Seed je zweimal aus, um Idempotenz zu prüfen.

## 7. Deployment und Betrieb (Kurzfassung)

Ausführlich in [DEPLOYMENT.md](DEPLOYMENT.md).

- **Server:** Hostinger-VPS `srv664259.hstgr.cloud` (46.202.155.191), Ordner `/opt/resort-members`,
  Benutzer `deploy`. Läuft neben quick-translator (jetzt `quit.ieb-digital.com`).
- **Container:** `app`, `db` (MySQL 8.4), `migrate` (einmaliger Lauf vor jedem Start).
- **HTTPS:** der Caddy von quick-translator; `deploy.sh` legt `/opt/caddy-sites/resort-members.caddy` an.
- **Ablauf:** Push/Merge auf `main` → CI grün → Workflow „Deploy“ → rsync → `scripts/deploy.sh`
  (Images bauen, migrieren, starten, Health-Check, Caddy) → Prüfung von `https://resort.ieb-digital.com/api/health`.
- **GitHub-Secrets (nur Namen):** `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`. **Variable:** `RM_DOMAIN`
  (optional `DEPLOY_USER`, `DEPLOY_HOST`, `DEPLOY_PATH`, `DEPLOY_PORT`).
- **Server-Zugangsdaten:** `deploy/.env.production` auf dem Server (Rechte 600), beim ersten Deploy
  erzeugt: `MYSQL_*`, `DATABASE_URL`, `SESSION_SECRET`, `TRUST_PROXY=1`. Nie in Git, nie im Log.
- **Konten:** Workflow „Konto anlegen“ (`create-member.yml`). Produktionskonten: `M200001` (Mitglied)
  und `A200001` (Admin), beide mit Passwortwechsel beim ersten Login. Passwörter stehen nirgends im Repo.

## 8. Offene Punkte

Siehe [NOTIZEN.md, „Offene Punkte und nächste Schritte“](NOTIZEN.md#offene-punkte-und-nächste-schritte):
E-Mail-Benachrichtigungen (SMTP), Begründung bei Ablehnung, Mitgliederverwaltung im Admin-Bereich,
Englisch/Französisch, WP9 Datenübernahme, Backups automatisieren, Staging-Lauf der Proxy-Tests.
