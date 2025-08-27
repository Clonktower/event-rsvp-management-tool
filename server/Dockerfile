# syntax=docker/dockerfile:1

# ---------- base with build tools ----------
FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ bash \
    && corepack enable

# ---------- deps ----------
FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

# ---------- build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# ---------- runtime ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodegrp && adduser -S node -G nodegrp \
    && apk add --no-cache bash

COPY package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

VOLUME ["/data"]
ENV PORT=3000
ENV SQLITE_DB_PATH=/data/app.db
EXPOSE 3000
USER node
CMD ["node","dist/server.js"]
