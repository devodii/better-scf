# Build context: the repository root (docker build -f apps/server/Dockerfile .).

# ---- base: Node 22 with the pnpm version pinned in package.json ----
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---- build: install server + shared (dev deps included), bundle with tsup ----
FROM base AS build
# Fallback toolchain in case better-sqlite3 has no prebuilt musl binary.
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/server/package.json apps/server/package.json
RUN pnpm install --frozen-lockfile --filter "server..."
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN pnpm --filter server build

# ---- prod-deps: production dependencies only (tsup bundles shared and dev deps) ----
FROM base AS prod-deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/server/package.json apps/server/package.json
RUN pnpm install --frozen-lockfile --prod --filter "server..."

# ---- runtime ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8787
WORKDIR /repo/apps/server
# Production node_modules (pnpm store links live in the root node_modules).
COPY --chown=node:node --from=prod-deps /repo/node_modules /repo/node_modules
COPY --chown=node:node --from=prod-deps /repo/apps/server/node_modules ./node_modules
COPY --chown=node:node apps/server/package.json ./package.json
COPY --chown=node:node --from=build /repo/apps/server/dist ./dist
# /data holds the optional sqlite answer cache. There is no VOLUME instruction
# (Railway ignores it): attach a Railway volume in the dashboard and mount it at
# /data. Railway mounts volumes owned by root, while this image runs as the
# non-root "node" user, so the sqlite file would not be writable. One-time fix
# when a volume is attached: set the service variable RAILWAY_RUN_UID=0.
# Without a volume the default stays non-root, and if the file cannot be opened
# the server falls back to its in-memory cache.
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8787
CMD ["node", "dist/index.js"]
