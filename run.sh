#!/usr/bin/env bash
# run.sh — Start Code Eval Engine
# Usage: ./run.sh [stop|logs]

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

case "${1:-start}" in

  stop)
    echo "Stopping backend services..."
    docker compose -f "$PROJECT_ROOT/docker-compose.yml" down
    echo "Done."
    ;;

  logs)
    docker compose -f "$PROJECT_ROOT/docker-compose.yml" logs -f
    ;;

  start|"")
    echo "========================================"
    echo "  Code Eval Engine — Starting up"
    echo "========================================"

    # 1. Start backend
    echo ""
    echo "[1/3] Starting backend services (Docker)..."
    docker compose -f "$PROJECT_ROOT/docker-compose.yml" up -d

    # 2. Wait for API to be healthy
    echo ""
    echo "[2/3] Waiting for API server to be ready..."
    for i in $(seq 1 30); do
      if curl -sf http://localhost:9000/ > /dev/null 2>&1; then
        echo "      API server is up."
        break
      fi
      sleep 2
      if [ "$i" -eq 30 ]; then
        echo "      ERROR: API server did not start in time."
        echo "      Run: docker compose logs server"
        exit 1
      fi
    done

    # 3. Start frontend
    echo ""
    echo "[3/3] Starting frontend (Vite dev server)..."
    cd "$FRONTEND_DIR"
    if [ ! -d node_modules ]; then
      echo "      Installing frontend dependencies..."
      npm install --silent
    fi

    echo ""
    echo "========================================"
    echo "  Ready!"
    echo "  Open: http://localhost:3000"
    echo "========================================"
    echo ""

    npm run dev
    ;;

  *)
    echo "Usage: $0 [start|stop|logs]"
    exit 1
    ;;
esac
