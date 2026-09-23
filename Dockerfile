# syntax=docker/dockerfile:1.7
# email-service — Node 20 + TypeScript (tsup) + Prisma 6 (npm)
#
# Premissas conferidas no repositório:
#   - `npm run build` gera dist/server.js e dist/swagger.yaml (tsup + cpy)
#   - `npm run dev` roda tsx --watch (src/server.js resolve para src/server.ts)
#   - `prisma.seed` no package.json usa tsx  -> o job de seed precisa das devDependencies
#   - `prisma` em `dependencies` (package.json E package-lock.json commitados, senão `npm ci` falha)
#
# Modo de execução: quem decide é o SCRIPT do package.json, escolhido pela variável START_SCRIPT:
#   START_SCRIPT=start      -> cross-env NODE_ENV=production  (padrão da imagem)
#   START_SCRIPT=start:dev  -> cross-env NODE_ENV=development (dev/test, contra mocks)
# Atenção: como o cross-env fixa o NODE_ENV dentro do script, um NODE_ENV passado por
# -e / --env-file / compose NÃO tem efeito. Para mudar o modo, mude o START_SCRIPT.
# resolveServiceUrl() lê *_SERVICE_URL_DEV ou *_SERVICE_URL_PROD conforme esse NODE_ENV.

ARG NODE_VERSION=20

# ---------- base ----------
# Debian slim (glibc) em vez de alpine: evita problemas de engine/OpenSSL do Prisma.
FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV PORT=8080 \
    HOST=0.0.0.0

# ---------- deps: todas as dependências + Prisma Client gerado ----------
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci
RUN npx prisma generate

# ---------- dev: src/ e prisma/ são montados por volume (hot reload) ----------
FROM deps AS dev
COPY . .
EXPOSE 8080 9229
# Para usar o debugger na 9229, adicione --inspect=0.0.0.0:9229 ao script "dev" do package.json.
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npm run dev"]

# ---------- migrate: job descartável (migrations) usado no modo test ----------
# Usa as devDependencies (o `prisma db seed` roda via tsx).
FROM deps AS migrate
COPY . .
CMD ["sh", "-c", "npx prisma migrate deploy"]

# ---------- build: compila com tsup (dist/server.js + dist/swagger.yaml) ----------
FROM deps AS build
COPY . .
RUN npm run build

# ---------- prod: só dependências de produção, sem root (deve ser o ÚLTIMO estágio) ----------
FROM base AS prod
# Padrão: `npm run start` (production). O app exige USER_SERVICE_URL_PROD nesse modo.
# Para rodar esta mesma imagem contra mocks: -e START_SCRIPT=start:dev
ENV NODE_ENV=production \
    START_SCRIPT=start
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev \
 && npx prisma generate
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 8080
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" = \"true\" ]; then npx prisma migrate deploy; fi && exec npm run \"$START_SCRIPT\""]