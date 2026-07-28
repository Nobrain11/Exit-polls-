FROM node:22-alpine AS builder

RUN apk add --no-cache openssl ca-certificates

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
RUN npx prisma generate
RUN mkdir -p /app/generated-client && cp -r node_modules/.prisma /app/generated-client/

COPY . .
RUN npm run build

FROM node:22-alpine AS production

RUN apk add --no-cache openssl ca-certificates bash curl

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/generated-client/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
