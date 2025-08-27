# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ bash
# enable corepack for yarn berry
RUN corepack enable

# -------- deps stage --------
FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
# If you commit .yarn directory (recommended), copy it too:
COPY .yarn/ .yarn/
RUN yarn install --immutable

# -------- build stage --------
FROM base AS build
COPY --from=deps /app/.yarn/ ./.yarn/
COPY --from=deps /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.pnp.* ./   # if you use PnP, include it
COPY . .
RUN yarn build

# -------- runtime stage --------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodegrp && adduser -S node -G nodegrp
RUN apk add --no-cache bash
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json
COPY dist ./dist
VOLUME ["/data"]
ENV PORT=3000
ENV SQLITE_DB_PATH="/data/app.db"
EXPOSE 3000
USER node
CMD ["node","dist/server.js"]
