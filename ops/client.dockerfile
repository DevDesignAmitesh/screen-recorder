FROM oven/bun:1.3.11

WORKDIR /usr/src/app

# copy neccessary package.jsons and lock file
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/notifications/package.json packages/notifications/package.json

# install dependencies
RUN bun install

COPY . .

ENV NEXT_PUBLIC_NODE_ENV=production
ENV DOCKER_CONTAINER=true

RUN bun run client:build

# run the app
EXPOSE 3000

CMD [ "bun", "run", "client:start" ]