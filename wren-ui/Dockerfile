FROM node:20-bookworm-slim AS base

# Install required packages
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

WORKDIR /app

# Install npm dependencies (devDeps included for the build stage)
FROM base AS deps
COPY package.json package-lock.json ./
# --prefer-offline reuses cache when possible; --no-audit/--no-fund skip slow extras
RUN npm ci --include=dev --prefer-offline --no-audit --no-fund

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY .eslintrc.json .eslintignore .prettierrc next.config.js tsconfig.json ./
COPY public ./public
COPY src ./src

# Remove packageManager field so Next.js does not try to call yarn when
# downloading the SWC binary (it falls back to npm registry detection).
RUN node -e "const p=require('./package.json'); delete p.packageManager; require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2))"

# Mount BuildKit cache for Next.js webpack — persists between builds so only
# changed pages/modules are recompiled instead of doing a full rebuild.
RUN --mount=type=cache,id=nextjs-cache,target=/app/.next/cache \
    npm run build

# Production runner — relies entirely on Next.js standalone output, which
# already bundles only the node_modules needed at runtime under
# .next/standalone/node_modules. No npm prune required.
FROM base AS runner
WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY migrations ./migrations
COPY knexfile.js ./knexfile.js

# Knex isn't traced into the standalone output (it's only used by the migrate
# CLI at startup, not by the Next.js server). Copy it and its transitive deps.
COPY --from=builder /app/node_modules/knex ./node_modules/knex
COPY --from=builder /app/node_modules/rechoir ./node_modules/rechoir
COPY --from=builder /app/node_modules/resolve ./node_modules/resolve
COPY --from=builder /app/node_modules/is-core-module ./node_modules/is-core-module
COPY --from=builder /app/node_modules/hasown ./node_modules/hasown
COPY --from=builder /app/node_modules/function-bind ./node_modules/function-bind
COPY --from=builder /app/node_modules/resolve-from ./node_modules/resolve-from
COPY --from=builder /app/node_modules/interpret ./node_modules/interpret
COPY --from=builder /app/node_modules/escalade ./node_modules/escalade
COPY --from=builder /app/node_modules/tildify ./node_modules/tildify
COPY --from=builder /app/node_modules/getopts ./node_modules/getopts

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["sh", "-c", "node ./node_modules/knex/bin/cli.js migrate:latest && HOSTNAME=0.0.0.0 node server.js"]
