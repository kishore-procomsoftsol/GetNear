FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json turbo.json ./
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY apps/admin/ ./apps/admin/
RUN npm ci
RUN npm run build --workspace=@getnear/config
RUN npm run build --workspace=@getnear/validation
RUN npm run build --workspace=@getnear/admin
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
