# syntax=docker/dockerfile:1

# ---- base (build tools + yarn via corepack) ----
FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ \
 && corepack enable

# ---- deps (install node_modules from lockfile) ----
FROM base AS deps
# If you have a .yarnrc.yml, include it here too
COPY . .
RUN yarn --version && node --version
RUN yarn install --immutable

# ---- build (compile TypeScript -> dist) ----
FROM base AS build
COPY . .
RUN yarn build

# ---- runtime (simple, no non-root user) ----
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# If you need a shell inside the container, uncomment:
# RUN apk add --no-cache bash

COPY package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

VOLUME ["/data"]
ENV PORT=3000
ENV SQLITE_DB_PATH=/data/app.db
EXPOSE 3000
CMD ["node","dist/index.js"]
