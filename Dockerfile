FROM node:20-alpine AS builder
RUN apk add --no-cache openssl ca-certificates
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma/

# Provide a dummy DATABASE_URL so Prisma does not choke on env() resolution
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy

# Generate Prisma client
RUN npx prisma generate

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
