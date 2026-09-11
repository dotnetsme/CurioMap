# CurioMap web — standalone Next.js output (no heavy runtime deps)
FROM node:24-alpine AS build
RUN apk add --no-cache libc6-compat
WORKDIR /src
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
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD curl -f http://127.0.0.1:3000/ || exit 1
CMD ["node", "server.js"]