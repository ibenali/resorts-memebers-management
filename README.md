# Resort-Mitgliederportal

Web-App für Resort-Mitglieder: Login per Mitgliedsnummer, Resorts und Saisons ansehen,
Feedback senden, Adresse und Passwort ändern, Urlaub anfragen.

Stack: Next.js 15 (App Router, TypeScript), Tailwind CSS 4, MySQL 8 (Drizzle ORM),
gedacht für **Hostinger Cloud Hosting** (Node.js-App). Details und Arbeitspakete: [docs/PLAN.md](docs/PLAN.md).

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

| Befehl                        | Zweck                                               |
| ----------------------------- | --------------------------------------------------- |
| `npm run dev`                 | Entwicklungsserver                                  |
| `npm run build` / `npm start` | Produktions-Build und Start (so auch auf Hostinger) |
| `npm run lint`                | ESLint                                              |
| `npm run typecheck`           | TypeScript-Prüfung                                  |
| `npm test`                    | Unit-Tests (Vitest)                                 |
| `npm run format`              | Prettier                                            |

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

Der Seed verweigert `NODE_ENV=production`, außer mit `ALLOW_SEED=1`.

## Sprache

Die Oberfläche ist deutsch. Alle Texte liegen in `src/lib/i18n/de.ts`, damit weitere
Sprachen später ergänzt werden können.
