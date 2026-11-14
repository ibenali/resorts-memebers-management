# Notizen zum Weiterarbeiten

Stand: 14.11.2026. Alles, was man braucht, um das Projekt später wieder aufzunehmen.
Hintergrund und Verlauf: [PROJEKTBERICHT.md](PROJEKTBERICHT.md).

> In diese Datei und in alle anderen Docs gehören **keine Passwörter, Schlüssel oder Secrets**,
> nur deren Namen. Ausnahme sind die Seed-Testkonten für die lokale Entwicklung im README.

## Auf einen Blick

| Was         | Wo                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Produktion  | https://resort.ieb-digital.com (Health: `/api/health`, meldet auch `db`)                         |
| Repository  | `ibenali/resorts-memebers-management`, Branch `main`                                             |
| Server      | Hostinger-VPS `srv664259.hstgr.cloud` / 46.202.155.191, `/opt/resort-members`, Benutzer `deploy` |
| Nachbar-App | quick-translator unter `quit.ieb-digital.com`, besitzt den Caddy (Ports 80/443)                  |
| Plan        | [PLAN.md](PLAN.md) (ursprünglicher Plan, Hosting dort noch als Cloud Hosting beschrieben)        |
| Deployment  | [DEPLOYMENT.md](DEPLOYMENT.md)                                                                   |
| Testfälle   | [TESTCASES.md](TESTCASES.md)                                                                     |

## Lokal starten

Voraussetzungen: Node.js 22 (`.nvmrc`), Docker.

```bash
cp .env.example .env
docker compose up -d mysql
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

App: http://localhost:3000. Seed-Konten für die Entwicklung: `M100001` (Mitglied),
`M100002` (muss Passwort ändern), `A000001` (Admin). Passwörter der Seed-Konten stehen im
[README](../README.md) bzw. in `scripts/seed-data.ts`; sie gelten nur lokal/in der CI.
`SEED_RESET_PASSWORDS=1 npm run db:seed` setzt sie zurück.

## Testen

```bash
npm run format:check && npm run lint && npm run typecheck
npm test                 # Unit-Tests (Vitest)
npm run test:db          # DB-Regeln gegen MySQL (DATABASE_URL nötig)
npm run build
E2E_PORT=3199 npm run test:e2e   # Playwright gegen den Build, Port 3100 ist oft belegt
```

- Specs der Features: `e2e/<feature>.spec.ts`; QA-Specs: `e2e/qa-*.spec.ts`; gemeinsame Helfer
  `e2e/helpers.ts` (`loginAs`, `formAlert`, `resetMembers`, `withDb`) nur ergänzen, nicht umbauen.
- IP-Limit und XFF-Spoofing laufen nur hinter dem Proxy (`E2E_BEHIND_PROXY=1`). Für einen Lauf
  gegen Produktion/Staging braucht `playwright.config.ts` noch eine `baseURL`-Option, und die
  Cookie-Domain in `qa-security.spec.ts` muss angepasst werden.
- Neue Testfälle aus Anforderungen in [TESTCASES.md](TESTCASES.md) eintragen.

## Regeln für neuen Code

- Jede Seite/Action unter `src/app/(member)` ruft `requireMember()` selbst auf; unter `admin/`
  `requireAdmin()`. Daten nur mit `member.id` aus der Session laden.
- Zod-Validierung auf jeder Server Action; Änderungen mit Sicherheitsbezug ins `audit_log`.
- Client-Komponenten importieren Wertelisten aus `src/lib/db/enums.ts`, nie aus `schema.ts`
  (sonst landet Drizzle im Browser-Bundle).
- In Server-Action-Formularen steht der geklickte Button nicht im `FormData`: pro Aktion ein
  eigenes Formular mit versteckten Feldern.
- UI-Texte nur in `src/lib/i18n/de.ts`.
- Schema ändern: `src/lib/db/schema.ts` anpassen, `npm run db:generate -- --name <beschreibung>`,
  SQL in `drizzle/` prüfen und committen. Die Migration läuft beim nächsten Deploy automatisch.
- TypeScript 5, ESLint 9 und `@playwright/test` 1.63.0 sind bewusst gepinnt.

## Deployen und mergen

- Jeder grüne CI-Lauf auf `main` deployt automatisch. Von Hand: **Actions → Deploy → Run workflow**.
- PRs mit **Merge-Commit** mergen (kein Squash), damit gestapelte Branches sauber bleiben.
- Migrationen laufen bei jedem Deploy (`docker compose run --rm migrate`), seit #18 auch mit neu
  gebautem `migrate`-Image.
- Fehlersuche auf dem Server: siehe [DEPLOYMENT.md, „Betrieb und Fehlersuche“](DEPLOYMENT.md#betrieb-und-fehlersuche).

### Konten in Produktion

Workflow **Actions → Konto anlegen → Run workflow** (nur von `main`), Eingaben: Mitgliedsnummer,
Vor- und Nachname, Startpasswort (wird im Log maskiert), Rolle `member`/`admin`, optional
Beispiel-Resorts. Bei bestehender Nummer wird das Passwort zurückgesetzt und alle Sessions beendet.
Das Konto muss das Passwort beim ersten Login ändern.

Angelegte Produktionskonten (14.11.2026): `M200001` (Mitglied), `A200001` (Admin).
Startpasswörter wurden nur dem Nutzer mitgeteilt und stehen nirgends im Repo.

### Secrets und Variablen (nur Namen)

| Ort                              | Name                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub-Secret                    | `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`                                                                                                                    |
| GitHub-Variable                  | `RM_DOMAIN` (= `resort.ieb-digital.com`), optional `DEPLOY_USER`, `DEPLOY_HOST`, `DEPLOY_PATH`, `DEPLOY_PORT`                                           |
| Server, `deploy/.env.production` | `NODE_ENV`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `DATABASE_URL`, `SESSION_SECRET`, `TRUST_PROXY=1`; später `SMTP_*` |

`TRUST_PROXY=1` ist nur richtig, solange die App ausschließlich über den einen Caddy erreichbar ist.
Kommt ein CDN oder weiterer Proxy davor, muss die IP-Ermittlung in `src/lib/auth/request-info.ts`
angepasst werden.

### Hinweise zur Arbeit mit Claude

- Merges nach `main`, SSH auf den VPS und Änderungen an Produktion werden vom Sicherheitsfilter
  (Auto-Modus) blockiert, wenn nur ein anderer Claude-Thread sie anfordert. Der Nutzer muss die
  konkrete Aktion im jeweiligen Thread selbst freigeben (Aktion und Ziel nennen, z. B.
  „Merge PR #19 nach main“).
- Selbst erstellte PRs darf ein Thread nur mit ausdrücklicher Freigabe des Nutzers mergen; sonst
  prüft und mergt der Review-Thread.
- Mehrere Threads teilen sich den Ordner `/Users/idrissbenali/src/resorts-memebers-management`.
  Wer nur einen eigenen Branch braucht, arbeitet in einem eigenen Klon, statt dort den Branch zu wechseln.

## Offene Punkte und nächste Schritte

Nach Priorität:

1. **Backups automatisieren.** Der `mysqldump`-Befehl steht in DEPLOYMENT.md, ist aber noch nicht
   als Cronjob eingerichtet. Zusätzlich prüfen, ob Hostinger-VPS-Snapshots aktiv sind.
2. **E-Mail-Benachrichtigungen** bei Entscheidung über Urlaubsanfragen und als Feedback-Bestätigung.
   Braucht SMTP (Hostinger-Mail, `nodemailer`), Variablen `SMTP_*` in `deploy/.env.production`.
   Danach auch „Passwort vergessen“ per E-Mail möglich (PLAN.md, offene Frage 5).
3. **Begründung bei Ablehnung** einer Urlaubsanfrage (neue Spalte, Anzeige beim Mitglied).
4. **Mitgliederverwaltung im Admin-Bereich:** Konten anlegen, Passwort zurücksetzen, sperren.
   Bis dahin über den Workflow „Konto anlegen“.
5. **Englisch und Französisch:** Texte liegen schon zentral in `src/lib/i18n/de.ts`; es fehlen
   `en.ts`/`fr.ts`, Sprachwahl (Cookie oder Pfad) und übersetzte Datums-/Zahlenformate.
6. **WP9 Datenübernahme** aus dem Altsystem: Gibt es echte Mitgliederdaten? Falls ja,
   Import-Skript CSV/Postgres → MySQL, Klartext-Passwörter sofort hashen, `must_change_password` setzen.
7. **Proxy-Tests gegen Produktion/Staging** (IP-Limit, XFF) mit `E2E_BEHIND_PROXY=1`, siehe „Testen“.
8. **Datenschutz/Impressum** als statische Seiten (PLAN.md Kap. 7, Punkt 10) und Branding
   (Logo, Farben) klären.
9. **Alter PR #3 (Devin, „Verification: Simple change and ESLint setup“):** auf GitHub bereits
   geschlossen und nicht gemergt; betrifft nur den entfernten Altcode. Nichts zu tun, außer den
   Branch `devin/1753598368-simple-change-verification` bei Gelegenheit zu löschen.
