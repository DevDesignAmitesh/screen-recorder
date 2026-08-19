FROM oven/bun:1.3.11

WORKDIR /usr/src/app

# copy neccessary package.jsons and lock file
COPY package.json bun.lock ./
COPY apps/server/package.json apps/server/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/notifications/package.json packages/notifications/package.json

# install dependencies
RUN bun install

COPY . .

ENV NODE_ENV=production
ENV DOCKER_CONTAINER=true

# ensure executable inside linux
RUN chmod +x /usr/src/app/http-entry.sh

# run the app
EXPOSE 4000

# absolute path
ENTRYPOINT ["/usr/src/app/http-entry.sh"]