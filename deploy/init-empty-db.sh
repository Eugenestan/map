#!/usr/bin/env bash
# Create an empty nhatrang_map database so the application can boot
# while we wait for Timeweb support to provide a pre-incident backup.
#
# Safe to re-run: aborts if the database already exists and contains tables,
# so we don't accidentally clobber a freshly restored dataset.
#
# Usage:
#   cd /opt/nhatrang-map
#   bash deploy/init-empty-db.sh

set -euo pipefail

if [[ ! -f compose.yaml ]]; then
  echo "[!] compose.yaml not found in $(pwd) — run from /opt/nhatrang-map" >&2
  exit 1
fi

DB_NAME="nhatrang_map"

echo "[*] Checking current state of Postgres..."
EXISTS=$(docker compose exec -T db psql -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" | tr -d '[:space:]' || true)

if [[ "$EXISTS" == "1" ]]; then
  TABLE_COUNT=$(docker compose exec -T db psql -U postgres -d "$DB_NAME" -tAc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" \
    | tr -d '[:space:]' || echo 0)
  if [[ "${TABLE_COUNT:-0}" -gt 0 ]]; then
    echo "[!] Database $DB_NAME already exists and has $TABLE_COUNT tables." >&2
    echo "    Aborting to avoid clobbering data. If you really want to wipe and recreate," >&2
    echo "    do it manually: docker compose exec db psql -U postgres -c 'DROP DATABASE $DB_NAME;'" >&2
    exit 1
  fi
  echo "[ok] Database $DB_NAME exists but is empty — leaving as is."
else
  echo "[*] Creating empty database $DB_NAME..."
  docker compose exec -T db psql -U postgres -c \
    "CREATE DATABASE $DB_NAME OWNER postgres;"
  echo "[ok] Database created."
fi

echo "[*] Restarting app container so it re-runs migrations and seed..."
docker compose restart app
echo "[ok] app restarted."

echo "[*] Waiting for app to come up (up to 60 seconds)..."
SUCCESS=0
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null | grep -q '^2..\|^3..'; then
    SUCCESS=1
    break
  fi
  sleep 2
done

echo
echo "[*] Last 20 lines of app logs:"
docker compose logs --tail=20 app || true
echo

if [[ "$SUCCESS" == "1" ]]; then
  echo "[ok] App responded on http://127.0.0.1:3000/."
else
  echo "[!] App did not respond within 60s — check logs above." >&2
fi

cat <<EOF

================================================================================
DONE. Summary:
  * Empty $DB_NAME database is now present and migrations have run.
  * Site should be reachable at https://vietradar.com (carrying empty data).
  * When Timeweb provides a backup, we will run a restore script that drops
    this empty database and recreates it from the dump.

QUICK CHECKS:
  curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
  curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/categories
  curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/places
================================================================================
EOF
