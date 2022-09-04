FROM node:16-alpine AS base

RUN apk update && apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@7.4.1 --activate 

WORKDIR /app

COPY src/bot/package.json .
COPY src/bot/pnpm-lock.yaml .

RUN pnpm install

COPY src/bot .

ENTRYPOINT [ "pnpm", "start" ]
