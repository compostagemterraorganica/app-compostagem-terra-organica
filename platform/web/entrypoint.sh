#!/bin/sh
# Legado: desenvolvimento local com build em runtime.
# Producao (Railway): use o Dockerfile multi-stage com ARG VITE_API_URL.
set -e

PORT="${PORT:-5900}"

echo "Building frontend (VITE_API_URL=${VITE_API_URL:-not set})"
npm run build

echo "Starting static server on port ${PORT}"
exec npx serve -s dist -l "${PORT}"
