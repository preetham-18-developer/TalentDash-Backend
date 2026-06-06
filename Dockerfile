# ─── Stage 1: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (for layer caching)
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Stage 2: Production ───────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

# Copy production node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Set permissions
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main"]

