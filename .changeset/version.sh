#!/usr/bin/env bash

pnpm changeset version
pnpm install --lockfile-only
git commit --all --amend --no-edit
