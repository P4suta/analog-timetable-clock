# syntax=docker/dockerfile:1.7
# 単一の Dockerfile から dev / check / lint / test / build 全部を派生させる。
# ローカル (docker compose)、CI、GitHub Pages ビルドはいずれもこのファイルを
# target 切替で呼び出すだけで済むようにしてある。

ARG BUN_VERSION=1.3.12

FROM oven/bun:${BUN_VERSION}-slim AS base
WORKDIR /app
ENV CI=1

FROM base AS deps
COPY package.json bun.lock .npmrc ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install --frozen-lockfile

FROM deps AS source
COPY . .
RUN bun run prepare

FROM source AS check
RUN bun run check

FROM source AS lint
RUN bun run lint

FROM source AS test
RUN bun run test:run

FROM source AS build
ARG BASE_PATH=""
ENV BASE_PATH=${BASE_PATH}
RUN bun run build

# build 成果物だけを取り出すための scratch stage。
# `docker buildx build --target build-output --output type=local,dest=./build .`
# でホストの ./build に SvelteKit static 出力をエクスポートできる。
# GitHub Actions の Pages デプロイもこの target を使う。
FROM scratch AS build-output
COPY --from=build /app/build /
