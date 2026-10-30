FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY backend/tsconfig.json backend/nest-cli.json ./
COPY backend/src ./src
COPY backend/data ./data
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && mkdir -p /app/uploads && chown node:node /app/uploads
COPY --from=build /app/dist ./dist
COPY backend/data ./data
COPY docker/backend-start.mjs ./docker/backend-start.mjs
USER node
EXPOSE 3000
CMD ["node", "docker/backend-start.mjs"]
