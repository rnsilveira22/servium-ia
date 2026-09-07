#!/usr/bin/env bash
# Executa a suíte E2E (Selenium) de forma determinística: DB -> seed -> API -> Web -> vitest.
# Uso: bash apps/e2e/run-e2e.sh   (ou: ./apps/e2e/run-e2e.sh)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

export HEADLESS="${HEADLESS:-1}"
export E2E_WEB_URL="${E2E_WEB_URL:-http://localhost:5173}"
export E2E_API_URL="${E2E_API_URL:-http://localhost:3000}"
export DATABASE_URL="${DATABASE_URL:-postgres://servium:servium_dev@localhost:5432/servium}"

API_LOG="$(mktemp)"
WEB_LOG="$(mktemp)"

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then kill -- "-$API_PID" 2>/dev/null || true; fi
  if [[ -n "${WEB_PID:-}" ]]; then kill -- "-$WEB_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

echo ">>> 1/6 Postgres (docker compose up -d --wait)"
npm run db:up >/dev/null

echo ">>> 2/6 Migrations (idempotente — CI e local idênticos)"
npm run migrate >/dev/null

echo ">>> 3/6 Seed (admin + operador)"
npm run seed >/dev/null

echo ">>> 4/6 Build da API"
npm run build -w @servium-ia/api >/dev/null

echo ">>> 5/6 API (:3000) + Web (:5173) em background"
: > "$API_LOG"
: > "$WEB_LOG"
setsid node apps/api/dist/main.js >"$API_LOG" 2>&1 &
API_PID=$!
setsid npm run dev -w @servium-ia/web -- --port 5173 --host 127.0.0.1 --strictPort >"$WEB_LOG" 2>&1 &
WEB_PID=$!

echo -n ">>> Aguardando API /health"
for _ in $(seq 1 60); do
  if curl -sf "${E2E_API_URL}/health" >/dev/null 2>&1; then
    echo "   [ok]"
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "   [FALHOU]"
    tail -20 "$API_LOG"
    exit 1
  fi
  sleep 1
done

echo -n ">>> Aguardando Web :5173"
for _ in $(seq 1 60); do
  if curl -sf "${E2E_WEB_URL}/login" >/dev/null 2>&1; then
    echo "   [ok]"
    break
  fi
  if ! kill -0 "$WEB_PID" 2>/dev/null; then
    echo "   [FALHOU]"
    tail -20 "$WEB_LOG"
    exit 1
  fi
  sleep 1
done

echo ">>> 6/6 Vitest E2E (HEADLESS=${HEADLESS})"
cd "$REPO_ROOT/apps/e2e"
npx vitest run --reporter=verbose