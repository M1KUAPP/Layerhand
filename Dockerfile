FROM oven/bun:1.4.2-alpine AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# playwright-core cannot be bundled, because it loads optional modules at
# run time, so the build leaves it external and the image carries the
# production dependencies beside the bundle.
FROM oven/bun:1.4.2-alpine AS production-dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

FROM oven/bun:1.4.2-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1.4.2-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/dist ./dist
USER bun
WORKDIR /app/dist
EXPOSE 3000
CMD ["bun", "index.js"]
