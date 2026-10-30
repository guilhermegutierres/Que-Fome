FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY index.html vite.config.js tsconfig.json ./
COPY src ./src
COPY public ./public
COPY backend/data/tags-receitas.json ./backend/data/tags-receitas.json
ENV VITE_API_URL=/api
ENV VITE_ALIMENTOS_SOURCE=postgres
RUN npm run build

FROM nginx:stable-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
