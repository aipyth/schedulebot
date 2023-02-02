FROM node:18-alpine AS base

# RUN apk update && apk add --no-cache libc6-compat
# RUN corepack enable && corepack prepare pnpm@7.4.1 --activate 

# RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm

# RUN apk add --no-cache curl \
#     && curl -sL https://unpkg.com/@pnpm/self-installer | node

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

COPY src/ .

ENTRYPOINT [ "yarn", "run", "start" ]
