#!/usr/bin/env bash
set -euo pipefail

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  exec docker compose up --build
fi

if command -v docker-compose >/dev/null 2>&1; then
  exec docker-compose up --build
fi

cat >&2 <<'EOF'
Docker Compose is not installed.

Try one of these:
  - Install the Docker Compose plugin and run: docker compose up --build
  - Install the legacy docker-compose binary and run: docker-compose up --build
EOF

exit 1
