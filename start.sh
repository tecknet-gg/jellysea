#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "=== Jellysea Stack Launcher ==="
echo "  Platform: $(uname -s)"
echo ""

# ── Prune Docker system ──
echo "[1/4] Pruning Docker system cache..."
docker system prune -af --filter "label!=keep" 2>/dev/null || true
docker builder prune -f 2>/dev/null || true
echo "       Done."

# ── Rebuild jellysea frontend ──
echo "[2/4] Building Jellysea frontend..."
if [[ "$(uname -s)" == "Darwin" ]] && [ -d ./jellysea-fork/.next ]; then
  # macOS: Docker build often runs out of space, so copy .next directly
  echo "       macOS detected. Copying local .next into running container..."
  COPYFILE_DISABLE=1 tar --no-xattrs -cf - -C ./jellysea-fork .next 2>/dev/null | \
    docker exec -i -u root jellysea sh -c 'rm -rf /app/.next && tar xf - -C /app' 2>/dev/null || true
else
  # Linux: build inside Docker (cleaner, no space issues)
  echo "       Linux / no local .next. Building inside Docker..."
  docker compose build jellysea 2>&1 | tail -5 || true
fi
echo "       Done."

# ── Pull other images & rebuild remaining ──
echo "[3/4] Pulling images..."
docker compose pull 2>/dev/null || true
echo "       Done."

# ── Start all services ──
echo "[4/4] Starting stack..."
docker compose up -d 2>&1

echo ""
echo "=== Stack is running ==="
echo "  Jellysea:      https://test.tecknet.dev  (via Cloudflare tunnel)"
echo "  Jellyfin:      http://localhost:8096"
echo "  Radarr:        http://localhost:7878"
echo "  Sonarr:        http://localhost:8989"
echo "  Prowlarr:      http://localhost:9696"
echo "  qBittorrent:   http://localhost:8080"
echo ""
echo "Desktop app:   Build from source for your platform"
echo "  macOS:        cd jellysea-fork && cargo tauri build"
echo "  Linux:        cd jellysea-fork && cargo tauri build"
echo "  Windows:      cd jellysea-fork && cargo tauri build"
echo "  Prebuilt:     https://github.com/tecknet-gg/jellysea/releases"
echo ""
echo "To view logs:   docker compose logs -f"
echo "To stop:        docker compose down"
