# CurioMap web — standalone Next.js output (no heavy runtime deps)
FROM node:24-alpine AS build
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install --no-audit --no-fund
COPY frontend .
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /src/.next/standalone ./standalone
COPY --from=build /src/.next/static ./standalone/.next/static
COPY --from=build /src/public ./standalone/public
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1
CMD ["node", "standalone/server.js"]