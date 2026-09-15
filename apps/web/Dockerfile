# ── Build (Vite) ───────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.2.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Se inyectan desde docker-compose (build.args). Las variables del entorno del proceso
# tienen prioridad sobre el .env del repo, así que el build no depende de apps/web/.env.
ARG VITE_API_URL
ARG VITE_APP_NAME="Nemedi Clinic"
ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_NAME=$VITE_APP_NAME

RUN pnpm build

# ── Runtime (nginx) ────────────────────────────────────────────
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
