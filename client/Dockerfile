FROM node:20-slim AS builder

WORKDIR /app
COPY shared ./shared
RUN npm ci --prefix shared && npm run build --prefix shared
COPY client/package*.json ./client/
RUN npm ci --prefix client
COPY client ./client
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3001
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
RUN npm run build --prefix client

FROM node:20-slim
WORKDIR /app/client
ENV NODE_ENV=production

COPY --from=builder /app/shared /app/shared
COPY --from=builder /app/client /app/client

EXPOSE 3000
CMD ["npm", "start"]
