FROM oven/bun:1

WORKDIR /usr/src/app

COPY package.json bun.lock ./
COPY apps/server/package.json apps/server/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/notifications/package.json packages/notifications/package.json

RUN bun install

COPY . .

ENV NODE_ENV=production
ENV DOCKER_CONTAINER=true

RUN chmod +x /usr/src/app/http-entry.sh

EXPOSE 4000

ENTRYPOINT ["/usr/src/app/http-entry.sh"]