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

# Copy .env.example as .env (it will be overridden by docker-compose, but harmless)
COPY --from=builder /app/.env.example ./.env

# Add wait-for-it script (https://github.com/vishnubob/wait-for-it)
ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

EXPOSE 3000
CMD ["wait-for-it.sh", "db:5432", "--", "wait-for-it.sh", "redis:6379", "--", "node", "dist/index.js"]
