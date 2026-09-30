# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app

ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Verifica se as variáveis públicas do Firebase chegaram ao build
RUN test -n "$NEXT_PUBLIC_FIREBASE_API_KEY" || (echo "ERRO: FIREBASE_API_KEY não chegou" && exit 1)
RUN test -n "$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" || (echo "ERRO: FIREBASE_AUTH_DOMAIN não chegou" && exit 1)
RUN test -n "$NEXT_PUBLIC_FIREBASE_PROJECT_ID" || (echo "ERRO: FIREBASE_PROJECT_ID não chegou" && exit 1)
RUN test -n "$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" || (echo "ERRO: STORAGE_BUCKET não chegou" && exit 1)
RUN test -n "$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" || (echo "ERRO: SENDER_ID não chegou" && exit 1)
RUN test -n "$NEXT_PUBLIC_FIREBASE_APP_ID" || (echo "ERRO: APP_ID não chegou" && exit 1)

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]