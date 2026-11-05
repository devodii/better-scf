FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/server/package.json apps/server/package.json
RUN pnpm install --frozen-lockfile --filter "server..."
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN pnpm --filter server build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/server/package.json apps/server/package.json
RUN pnpm install --frozen-lockfile --prod --filter "server..."

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8787
WORKDIR /repo/apps/server
COPY --chown=node:node --from=prod-deps /repo/node_modules /repo/node_modules
COPY --chown=node:node --from=prod-deps /repo/apps/server/node_modules ./node_modules
COPY --chown=node:node apps/server/package.json ./package.json
COPY --chown=node:node --from=build /repo/apps/server/dist ./dist
USER node
EXPOSE 8787
CMD ["node", "dist/index.js"]
