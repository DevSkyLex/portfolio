# syntax=docker/dockerfile:1
# Image of a NestJS service (content, contact, identity), built after:
#   npx nx run <service>:prune     → dist/apps/<service> (bundle, migrations, pruned package.json and lockfile)
# Build context: one pruned service directory, filtered by service.Dockerfile.dockerignore.
#   docker build -f docker/service.Dockerfile --build-arg SERVICE=content-service \
#     -t portfolio-content-service dist/apps/content-service
#
# Base images pinned by version and digest (updated together, e.g. by Renovate/Dependabot).
# The runtime is plain Alpine plus the Node binary: no npm, npx, corepack or yarn in production.
ARG NODE_IMAGE=node:24.22.2-alpine3.23@sha256:9b69af715c7f9d038150b54ccccbaeffa9064bbc93e2904c29591ca097316af1
ARG RUNTIME_IMAGE=alpine:3.23.7@sha256:ff7f0c727dd796aa36787bfcd9a64bf35a6ce72a73451b3359fde849b6703d63

FROM ${NODE_IMAGE} AS node

FROM node AS deps
WORKDIR /app
COPY package.json package-lock.json ./

# Production dependencies only, without install scripts; the npm cache stays out of the layers.
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM ${RUNTIME_IMAGE}

# Node's shared libraries; same user as the official image (UID/GID 1000, `service_uid` in Ansible).
# hadolint ignore=DL3018
RUN apk add --no-cache libstdc++ \
 && addgroup -g 1000 node \
 && adduser -u 1000 -G node -s /sbin/nologin -D -H node
COPY --from=node /usr/local/bin/node /usr/local/bin/node
ENV NODE_ENV=production

# The port comes from the service configuration (<CTX>_PORT); the health probe reads the same value.
ENV SERVICE_PORT=3000
WORKDIR /app

# Files owned by root, read-only for the service user.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json main.js cli.js ./
COPY migrations ./migrations

# Service identity affects metadata only, preserving shared runtime-layer cache keys.
ARG SERVICE
LABEL org.opencontainers.image.title="portfolio-${SERVICE}"
USER 1000:1000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD ["/bin/sh", "-c", "wget -q -O /dev/null \"http://127.0.0.1:${SERVICE_PORT}/health/live\""]
CMD ["node", "main.js"]
