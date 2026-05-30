FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY api/ ./api/

RUN npm ci

RUN npm run build --workspace=@getnear/config
RUN npm run build --workspace=@getnear/validation
RUN npm run build --workspace=api

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/api/dist ./dist
COPY --from=builder /app/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/validation/dist ./node_modules/@getnear/validation/dist
COPY --from=builder /app/packages/validation/package.json ./node_modules/@getnear/validation/package.json
COPY --from=builder /app/packages/config/dist ./node_modules/@getnear/config/dist
COPY --from=builder /app/packages/config/package.json ./node_modules/@getnear/config/package.json

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
