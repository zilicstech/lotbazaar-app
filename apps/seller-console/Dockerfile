# Build from the repository root (the npm workspace and its lockfile live there):
#   docker build -f apps/seller-console/Dockerfile --build-arg API_URL=https://api.example.com -t lotbazaar-seller-console .
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/seller-console/package.json apps/seller-console/
COPY apps/buyer-web/package.json apps/buyer-web/
RUN npm ci --ignore-scripts

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/seller-console ./apps/seller-console
# rewrites() in next.config.ts is evaluated at build time and baked into the standalone
# output, so the backend URL must be present HERE, not only at runtime.
ARG API_URL
ENV API_URL=${API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace @lotbazaar/seller-console

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
# Never run as root.
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/apps/seller-console/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/seller-console/.next/static ./apps/seller-console/.next/static
COPY --from=build --chown=app:app /app/apps/seller-console/public ./apps/seller-console/public
USER app
EXPOSE 3001
CMD ["node", "apps/seller-console/server.js"]
