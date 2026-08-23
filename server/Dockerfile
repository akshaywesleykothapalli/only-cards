FROM node:20-slim AS builder

WORKDIR /app
COPY shared ./shared
RUN npm ci --prefix shared && npm run build --prefix shared
COPY server/package*.json ./server/
RUN npm ci --prefix server
COPY server ./server
RUN npm run build --prefix server
RUN npm exec --prefix server prisma generate

FROM node:20-slim
WORKDIR /app/server
ENV NODE_ENV=production

COPY --from=builder /app/shared /app/shared
COPY --from=builder /app/server /app/server

EXPOSE 3001
# Apply any pending migrations against the (now-external) Postgres database
# before booting - a fresh container no longer has a pre-populated dev.db
# file to fall back on like the old SQLite setup did.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
