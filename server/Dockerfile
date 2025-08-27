FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

VOLUME ["/data"]
ENV PORT=3000
ENV SQLITE_DB_PATH=/data/app.db
EXPOSE 3000
CMD ["node","dist/index.js"]
