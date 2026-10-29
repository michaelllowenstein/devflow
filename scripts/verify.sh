#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node --version
npm --version
npm ci
npm run typecheck
npm test
npm audit --omit=dev
printf '\nPASS: typecheck + unit + stdio integration + production dependency audit\n'
