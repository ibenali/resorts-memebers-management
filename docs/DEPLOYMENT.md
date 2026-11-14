# Deployment auf den Hostinger-VPS

Die App läuft auf demselben Hostinger-VPS wie quick-translator (`srv664259.hstgr.cloud`, 46.202.155.191) in eigenen Docker-Containern unter `/opt/resort-members`:

| Container | Aufgabe                                                                                      |
| --------- | -------------------------------------------------------------------------------------------- |
| `app`     | Next.js-Server (Standalone-Build, Port 3000 im Container, auf dem Host nur `127.0.0.1:3100`) |
| `db`      | MySQL 8.4, Daten in `/opt/resort-members/data/mysql`                                         |
| `migrate` | Einmaliger Lauf von `scripts/migrate.mjs` vor jedem Start                                    |

HTTPS übernimmt der vorhandene Caddy von quick-translator. Er lädt alle Dateien aus `/opt/caddy-sites/*.caddy`; `scripts/deploy.sh` legt dort `resort-members.caddy` an und leitet die Domain über das Docker-Netz `edge` an `resort-members-app:3000` weiter. Das Zertifikat holt Caddy automatisch von Let's Encrypt.

Wichtig für Login und Sperre nach Fehlversuchen: Zwischen Internet und App steht **genau ein** Proxy (dieser Caddy). Die App liest die Client-IP aus dem letzten Eintrag von `X-Forwarded-For`; Caddy vertraut ohne `trusted_proxies` keinem eingehenden Header und setzt dort die echte Client-IP. Kein weiteres CDN oder Proxy davorschalten, ohne die App anzupassen. Das Session-Cookie ist in Produktion `Secure`, die App funktioniert deshalb nur über HTTPS (oder über `http://localhost` per SSH-Tunnel, siehe unten). `COOKIE_SECURE=false` in `deploy/.env.production` schaltet das ab, ist aber nur für Notfälle gedacht.

## Ablauf

Push auf `main` → CI (Lint, Typecheck, Tests, Build) → bei Erfolg startet [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml):

1. Code per `rsync` über SSH nach `/opt/resort-members` kopieren (`data/` und `deploy/.env.production` bleiben unberührt).
2. `scripts/deploy.sh` auf dem Server: Zugangsdaten beim ersten Mal erzeugen, Images bauen, Datenbank migrieren, App starten, auf `/api/health` warten, Domain beim Caddy anmelden.
3. `https://<RM_DOMAIN>/api/health` prüfen.

Von Hand: **Actions → Deploy → Run workflow**.

## Einmalige Einrichtung

### Server

Docker, rsync und der Benutzer `deploy` existieren schon (Einrichtung von quick-translator). Zusätzlich als `root`:

```sh
mkdir -p /opt/resort-members && chown deploy:deploy /opt/resort-members
# Der Benutzer deploy muss die Caddy-Site-Datei ablegen dürfen:
mkdir -p /opt/caddy-sites && chgrp deploy /opt/caddy-sites && chmod g+w /opt/caddy-sites
```

### GitHub-Secrets und -Variablen

Unter **Settings → Secrets and variables → Actions** in `ibenali/resorts-memebers-management`:

| Art                 | Name              | Inhalt                                                                                    |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| Secret              | `SSH_PRIVATE_KEY` | privater Deploy-Schlüssel für `deploy@46.202.155.191` (derselbe wie bei quick-translator) |
| Secret              | `SSH_KNOWN_HOSTS` | Ausgabe von `ssh-keyscan -t ed25519 46.202.155.191`                                       |
| Variable            | `RM_DOMAIN`       | Domain der App, z. B. `mitglieder.eib-digital.com` (ohne Angabe läuft die App nur intern) |
| Variable (optional) | `DEPLOY_USER`     | Standard `deploy`                                                                         |
| Variable (optional) | `DEPLOY_HOST`     | Standard `46.202.155.191`                                                                 |
| Variable (optional) | `DEPLOY_PATH`     | Standard `/opt/resort-members`                                                            |

GitHub-Secrets lassen sich nicht aus einem anderen Repository auslesen. Ist der private Schlüssel von quick-translator nicht mehr vorhanden, einen neuen erzeugen und zusätzlich beim Benutzer `deploy` hinterlegen:

```sh
ssh-keygen -t ed25519 -N "" -C "github-deploy resort-members" -f rm_deploy
ssh-copy-id -i rm_deploy.pub deploy@46.202.155.191
gh secret set SSH_PRIVATE_KEY -R ibenali/resorts-memebers-management < rm_deploy
ssh-keyscan -t ed25519 46.202.155.191 | gh secret set SSH_KNOWN_HOSTS -R ibenali/resorts-memebers-management
rm rm_deploy rm_deploy.pub
```

### Domain

Beim DNS-Anbieter von `eib-digital.com` einen A-Eintrag für die gewählte Subdomain auf `46.202.155.191` anlegen und `RM_DOMAIN` setzen. Beim nächsten Deployment ist die App unter `https://<RM_DOMAIN>` erreichbar.

## Zugangsdaten

`deploy/.env.production` entsteht beim ersten Deployment auf dem Server (Rechte 600) und enthält MySQL-Passwörter, `DATABASE_URL` und `SESSION_SECRET`. Sie liegt nie in Git und nie im Actions-Log. Weitere Variablen (z. B. `SMTP_*`) dort ergänzen und `sh scripts/deploy.sh` erneut ausführen.

## Ohne Domain testen

```sh
ssh -L 3100:127.0.0.1:3100 deploy@46.202.155.191
# dann im Browser: http://localhost:3100
```

## Betrieb und Fehlersuche

```sh
cd /opt/resort-members
docker compose -f deploy/compose.yaml ps
docker compose -f deploy/compose.yaml logs --tail 100 app
docker compose -f deploy/compose.yaml run --rm migrate   # Migrationen von Hand
sh scripts/deploy.sh                                     # Deployment von Hand wiederholen
```

Backup der Datenbank (z. B. als täglicher Cronjob von `deploy`):

```sh
cd /opt/resort-members && mkdir -p data/backups
docker compose -f deploy/compose.yaml exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction resort_members' \
  | gzip > data/backups/resort_members-$(date +%F).sql.gz
```
