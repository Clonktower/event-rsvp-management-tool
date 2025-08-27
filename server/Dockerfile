# syntax=docker/dockerfile:1

# ---------- base with build tools (for sqlite/better-sqlite3) ----------
FROM node:24-alpine AS base
WORKDIR .
RUN apk add --no-cache python3 make g++ bash \
    && corepack enable

# ---------- deps: install node_modules via Yarn Berry ----------
FROM base AS deps
# Only copy manifests needed to compute the install
COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack install -g || true
RUN yarn --version && node --version
RUN yarn install --immutable

# ---------- build TS ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# ---------- runtime (small, non-root) ----------
FROM node:24-alpine AS runtime
WORKDIR .
ENV NODE_ENV=production
RUN addgroup -S nodegrp && adduser -S node -G nodegrp \
    && apk add --no-cache bash
# Copy only what's needed to run
COPY package.json ./package.json

# SQLite data volume
VOLUME ["/data"]
ENV PORT=3000
ENV SQLITE_DB_PATH=/data/app.db
EXPOSE 3000
USER node
CMD ["node","dist/server.js"]
