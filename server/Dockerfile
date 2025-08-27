# syntax=docker/dockerfile:1

# ---------- base (build tools + yarn via corepack) ----------
FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ \
 && corepack enable

# ---------- deps (install node_modules from lockfile) ----------
FROM base AS deps
# If you don't have .yarnrc.yml, remove it from the COPY line.
COPY package.json yarn.lock ./
# If you DO have .yarnrc.yml with nodeLinker: node-modules, add it:
# COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn --version && node --version
RUN yarn install --immutable

# ---------- build (compile TypeScript -> dist) ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# ---------- runtime (small, non-root) ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user and group (Alpine-safe syntax)
RUN addgroup -S nodegrp \
 && adduser -S -G nodegrp node

# Optional: bash only if you actually need an interactive shell
# RUN apk add --no-cache bash

# Copy only what's needed to run
COPY package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# SQLite data volume
VOLUME ["/data"]
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node","dist/server.js"]
