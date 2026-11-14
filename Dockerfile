# Produktions-Image für den Hostinger-VPS (siehe docs/DEPLOYMENT.md).
# Stufen: deps → builder → runner (App) und migrate (einmaliger Migrationslauf).
FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Migrationen laufen mit dem vollständigen Quellcode und allen Abhängigkeiten,
# getrennt vom schlanken App-Image. Fehlt scripts/migrate.mjs noch, passiert nichts.
FROM base AS migrate
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER node
CMD ["sh", "-c", "if [ -f scripts/migrate.mjs ]; then node scripts/migrate.mjs; else echo 'Keine Migrationen vorhanden.'; fi"]

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health > /dev/null || exit 1
CMD ["node", "server.js"]
