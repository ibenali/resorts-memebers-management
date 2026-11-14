#!/bin/sh
# Läuft auf dem VPS, aufgerufen von .github/workflows/deploy.yml (oder von Hand im Projektordner).
# Legt beim ersten Start Zugangsdaten an, baut die Images, migriert die Datenbank,
# startet die App und meldet die Domain beim Caddy von quick-translator an.
# deploy/.env.production und ./data werden nie überschrieben.
set -eu
cd "$(dirname "$0")/.."

ENV_FILE=deploy/.env.production
COMPOSE="docker compose -f deploy/compose.yaml"

RM_DOMAIN=${RM_DOMAIN:-}
RM_DOMAIN=${RM_DOMAIN#https://}
RM_DOMAIN=${RM_DOMAIN#http://}
RM_DOMAIN=${RM_DOMAIN%%/*}

# 1. Zugangsdaten einmalig erzeugen (stehen nie im Actions-Log und nie in Git).
if [ ! -s "$ENV_FILE" ]; then
	echo "Erster Start: Zugangsdaten werden in $(pwd)/$ENV_FILE angelegt."
	rnd() { head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'; }
	db_pw=$(rnd)
	umask 077
	cat > "$ENV_FILE" <<ENV
NODE_ENV=production
MYSQL_DATABASE=resort_members
MYSQL_USER=resort
MYSQL_PASSWORD=$db_pw
MYSQL_ROOT_PASSWORD=$(rnd)
DATABASE_URL=mysql://resort:$db_pw@db:3306/resort_members
SESSION_SECRET=$(rnd)
ENV
fi
chmod 600 "$ENV_FILE"
mkdir -p data/mysql

# 2. Gemeinsames Netz mit dem Caddy von quick-translator.
docker network create edge > /dev/null 2>&1 || true

# 3. Bauen, migrieren, starten.
$COMPOSE pull --quiet --ignore-buildable 2>/dev/null || true
$COMPOSE build --pull
$COMPOSE up -d db
$COMPOSE run --rm migrate
$COMPOSE up -d --remove-orphans app

# 4. Auf den Health-Check der App warten.
app=$($COMPOSE ps -q app)
i=0
while :; do
	state=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$app")
	[ "$state" = healthy ] && break
	i=$((i + 1))
	if [ "$state" = unhealthy ] || [ "$i" -ge 40 ]; then
		echo "App ist nicht gesund geworden (Status: $state)." >&2
		$COMPOSE ps
		$COMPOSE logs --tail 80 app
		exit 1
	fi
	sleep 5
done

# 5. Domain beim Caddy anmelden (nur wenn RM_DOMAIN gesetzt ist).
SITE=/opt/caddy-sites/resort-members.caddy
if [ -n "$RM_DOMAIN" ]; then
	if [ -d /opt/caddy-sites ] && [ -w /opt/caddy-sites ]; then
		printf '%s {\n\tencode zstd gzip\n\treverse_proxy resort-members-app:3000\n}\n' "$RM_DOMAIN" > "$SITE.tmp"
		if ! cmp -s "$SITE.tmp" "$SITE" 2>/dev/null; then
			mv "$SITE.tmp" "$SITE"
			proxy=$(docker ps -q --filter label=com.docker.compose.project=quick-translator --filter label=com.docker.compose.service=proxy | head -n1)
			if [ -n "$proxy" ]; then
				docker exec "$proxy" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
				echo "Caddy neu geladen: https://$RM_DOMAIN"
			else
				echo "Hinweis: Caddy-Container von quick-translator nicht gefunden, Domain noch nicht aktiv." >&2
			fi
		else
			rm -f "$SITE.tmp"
		fi
	else
		echo "Hinweis: /opt/caddy-sites fehlt oder ist für $(id -un) nicht beschreibbar, siehe docs/DEPLOYMENT.md." >&2
	fi
else
	echo "RM_DOMAIN nicht gesetzt: App läuft nur intern auf 127.0.0.1:3100."
fi

$COMPOSE ps
docker image prune -f > /dev/null
echo "Deployment fertig."
