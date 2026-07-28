#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "=== Jellysea Stack Launcher ==="
echo ""

# ── Prune Docker system ──
echo "[1/4] Pruning Docker system cache..."
docker system prune -af --filter "label!=keep" 2>/dev/null || true
docker builder prune -f 2>/dev/null || true
echo "       Done."

# ── Rebuild jellysea frontend (if .next dir exists locally, copy it) ──
echo "[2/4] Building Jellysea frontend..."
if [ -d ./jellysea-fork/.next ]; then
  echo "       Local .next build found. Copying into container..."
  COPYFILE_DISABLE=1 tar --no-xattrs -cf - -C ./jellysea-fork .next 2>/dev/null | \
    docker exec -i -u root jellysea sh -c 'rm -rf /app/.next && tar xf - -C /app' 2>/dev/null || true
else
  echo "       Building jellysea-fork Next.js frontend..."
  cd ./jellysea-fork
  npm run build:next 2>/dev/null || npx next build 2>/dev/null || true
  cd "$PROJECT_DIR"
fi
echo "       Done."

# ── Pull latest images & rebuild ──
echo "[3/4] Pulling images and rebuilding..."
docker compose pull 2>/dev/null || true
docker compose build --no-cache 2>&1 | tail -5 || docker compose build 2>&1 | tail -5 || true
echo "       Done."

# ── Start all services ──
echo "[4/4] Starting stack..."
docker compose up -d 2>&1

echo ""
echo "=== Stack is running ==="
echo "  Jellysea Web:   https://test.tecknet.dev"
echo "  Jellysea App:   ./jellysea-fork/src-tauri/target/release/bundle/macos/Jellysea.app"
echo "  Jellyfin:       http://localhost:8096"
echo "  Radarr:         http://localhost:7878"
echo "  Sonarr:         http://localhost:8989"
echo "  Prowlarr:       http://localhost:9696"
echo "  qBittorrent:    http://localhost:8080"
echo ""
echo "Desktop app (requires local Rust + MPV):"
echo "  cd jellysea-fork && cargo tauri dev"
echo ""
echo "To view logs:   docker compose logs -f"
echo "To stop:        docker compose down"
