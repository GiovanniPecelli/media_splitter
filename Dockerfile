# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci --omit=dev=false

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install system FFmpeg (replaces bundled @ffmpeg-installer binary)
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Point fluent-ffmpeg to system FFmpeg
ENV FFMPEG_PATH=/usr/bin/ffmpeg

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Copy built artifacts
COPY --from=builder /app/public          ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static    ./.next/static

# Temp dir for uploads (writable by nextjs user)
RUN mkdir -p /tmp/splitter && chown nextjs:nodejs /tmp/splitter

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
