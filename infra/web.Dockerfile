# CurioMap web — standalone Next.js output (no heavy runtime deps)
FROM node:24-alpine AS build
RUN apk add --no-cache libc6-compat
WORKDIR /src
# Public map basemap provider (ADR 0007). Next inlines NEXT_PUBLIC_* values at
# BUILD time, so this must arrive as a build arg (Fly: [build.args] on a web
# deploy) — a runtime env var or secret on the web app has no effect.
ARG NEXT_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
ENV NEXT_PUBLIC_MAP_TILE_URL=$NEXT_PUBLIC_MAP_TILE_URL
# The /api proxy target is also resolved at build time (next.config.ts `rewrites`, baked into the
# standalone output). Production sets it on the Fly build; the local compose stack passes http://api:8080.
ARG API_INTERNAL_URL=http://localhost:8080
ENV API_INTERNAL_URL=$API_INTERNAL_URL
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY frontend ./
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /src/.next/standalone ./
COPY --from=build /src/.next/static ./.next/static
# public/ is optional — only copy when the project has one.
COPY --from=build /src/public ./public
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Run as the unprivileged `node` user from the base image.
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD curl -f http://127.0.0.1:3000/ || exit 1
CMD ["node", "server.js"]