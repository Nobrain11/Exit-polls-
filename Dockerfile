FROM node:20-alpine AS builder
RUN apk add --no-cache openssl ca-certificates
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma/
RUN npx prisma@5.15.0 generate
COPY . .
RUN npm run build

FROM node:20-alpine AS production
RUN apk add --no-cache openssl ca-certificates
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env.example ./.env
EXPOSE 3000
CMD ["node", "dist/index.js"]
