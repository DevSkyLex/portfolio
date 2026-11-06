# syntax=docker/dockerfile:1
# Angular SSR bundle, built by `npx nx build web`; no content snapshot is included at runtime.
ARG NODE_IMAGE=node:24.22.2-alpine3.23@sha256:9b69af715c7f9d038150b54ccccbaeffa9064bbc93e2904c29591ca097316af1
ARG RUNTIME_IMAGE=alpine:3.23.7@sha256:ff7f0c727dd796aa36787bfcd9a64bf35a6ce72a73451b3359fde849b6703d63

FROM ${NODE_IMAGE} AS node
FROM ${RUNTIME_IMAGE}
# hadolint ignore=DL3018
RUN apk add --no-cache libstdc++ \
 && addgroup -g 1000 node \
 && adduser -u 1000 -G node -s /sbin/nologin -D -H node
COPY --from=node /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
ENV NODE_ENV=production PORT=4000 HOST=0.0.0.0
COPY browser ./browser
COPY server ./server
COPY 3rdpartylicenses.txt ./
USER 1000:1000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD ["/bin/sh", "-c", "wget -q -O /dev/null http://127.0.0.1:4000/health/live"]
CMD ["node", "server/server.mjs"]
