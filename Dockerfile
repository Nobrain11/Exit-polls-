FROM node:22-alpine AS builder
RUN apk add --no-cache openssl ca-certificates
WORKDIR /app
COPY package*.json ./
RUN npm install                    # installs all deps (including prisma)
COPY prisma ./prisma/
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
RUN npx prisma generate
# Save the generated client so we can copy it into the production image
RUN mkdir -p /app/generated-client && cp -r node_modules/.prisma /app/generated-client/

COPY . .
RUN npm run build

FROM node:22-alpine AS production
RUN apk add --no-cache openssl ca-certificates
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev              # installs @prisma/client and other production deps
# Copy the pre‑generated Prisma client into node_modules
COPY --from=builder /app/generated-client/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env.example ./.env
EXPOSE 3000
CMD ["node", "dist/index.js"]
