# Build stage – uses npm install to generate package-lock.json
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install                    # <-- changed from npm ci
COPY prisma ./prisma/
RUN npx prisma generate
COPY . .
RUN npm run build

# Production stage – now has lockfile, can use npm ci
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev              # uses lockfile from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env.example ./.env
EXPOSE 3000
CMD ["node", "dist/index.js"]
