#!/bin/sh
# Fail fast if something goes wrong
set -e

echo "Running Prisma generate..."
bun run db:generate

echo "Starting http backend..."
bun run start:http