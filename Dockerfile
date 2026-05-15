# ─────────────────────────────────────────────────────────────────────────────
# Jan Aushadhi Finder — Dockerfile
# Multi-stage build for minimal production image
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies only (cached layer)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Stage 2: Production Image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 janaushadhi

# Copy deps from stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY package.json ./

# Set ownership
RUN chown -R janaushadhi:nodejs /app

USER janaushadhi

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Start
CMD ["node", "backend/server.js"]
