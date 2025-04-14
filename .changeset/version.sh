#!/usr/bin/env bash
set -eo pipefail

pnpm changeset version
pnpm install --lockfile-only
git commit --all --amend --no-edit
