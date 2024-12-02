# check=skip=SecretsUsedInArgOrEnv

FROM node:22.11.0-slim AS base

ARG APP_DOMAIN="sandbox.exactly.app"
ARG CHAIN_ID="11155420"
ARG EXPO_PUBLIC_ALCHEMY_API_KEY="YrH_56532-d48Mnz1QUwAIMdgyqVYU4C"
ARG EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID="dc767b7d-9ce8-4512-ba67-ebe2cf7a1577"
ARG EXPO_PUBLIC_ONE_SIGNAL_APP_ID=""
ARG EXPO_PUBLIC_SENTRY_DSN=""

FROM base AS build
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y ca-certificates curl git rsync unzip --no-install-recommends && \
  rm -rf /var/lib/apt/lists/* && \
  curl -fsSL https://get.pnpm.io/install.sh | bash && \
  curl -fsSL https://foundry.paradigm.xyz | bash
ENV PATH="$PATH:/root/.local/share/pnpm:/root/.foundry/bin"
RUN foundryup
WORKDIR /usr/src/app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
RUN pnpm expo export --platform web --source-maps --output-dir server/app && \
  pnpm run --filter server build && \
  pnpm deploy --filter server --prod /prod/server

FROM base AS server
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y dumb-init --no-install-recommends && \
  rm -rf /var/lib/apt/lists/* && \
  adduser --group --system server
WORKDIR /prod/server
COPY --from=build --chown=server:server /prod/server .
USER server
EXPOSE 3000/tcp
ENTRYPOINT ["dumb-init", "node", "--require=./instrument.cjs", "dist/index.cjs"]
