# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are compiled into the browser bundle. Production defaults
# to same-origin routing through Envoy Gateway, so all values may remain empty.
ARG NEXT_PUBLIC_IAM_URL=""
ARG NEXT_PUBLIC_GATEWAY_LOGIN_URL=""
ARG NEXT_PUBLIC_GATEWAY_LOGOUT_URL=""
ENV NEXT_PUBLIC_IAM_URL=${NEXT_PUBLIC_IAM_URL}
ENV NEXT_PUBLIC_GATEWAY_LOGIN_URL=${NEXT_PUBLIC_GATEWAY_LOGIN_URL}
ENV NEXT_PUBLIC_GATEWAY_LOGOUT_URL=${NEXT_PUBLIC_GATEWAY_LOGOUT_URL}

RUN npm run build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache wget \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/.next/cache \
    && chown -R nextjs:nodejs /app/.next

USER nextjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/healthz || exit 1

CMD ["node", "server.js"]
