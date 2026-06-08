#!/usr/bin/env bash
# Reset compromised Postgres password and apply the localhost port binding.
# Run on the production VPS once, after `git pull` brings in the new
# compose.yaml that binds Postgres to 127.0.0.1.
#
# Usage:
#   cd /opt/nhatrang-map
#   bash deploy/secure-db.sh
#
# Idempotent: safe to re-run.

set -euo pipefail

ENV_FILE=".env"
PASSWORD_LOG="$HOME/postgres-password.txt"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[!] $ENV_FILE not found — run this from /opt/nhatrang-map" >&2
  exit 1
fi

if [[ ! -f compose.yaml ]]; then
  echo "[!] compose.yaml not found in $(pwd)" >&2
  exit 1
fi

echo "[*] Checking that compose.yaml binds Postgres to 127.0.0.1..."
if grep -qE '^\s*-\s*"5432:5432"' compose.yaml; then
  echo "[!] compose.yaml still has \"5432:5432\" (publicly exposed)." >&2
  echo "    Run: git fetch origin && git reset --hard origin/master" >&2
  echo "    Then re-run this script." >&2
  exit 1
fi

if grep -qE '^\s*-\s*"127\.0\.0\.1:5432:5432"' compose.yaml; then
  echo "[ok] compose.yaml binds Postgres to 127.0.0.1 only."
else
  echo "[!] compose.yaml does not contain the expected '127.0.0.1:5432:5432' binding." >&2
  exit 1
fi

echo "[*] Generating new Postgres password (32 random alphanumeric chars)..."
NEW_PASS=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)
echo "[ok] Password generated."

echo "[*] Saving the new password to $PASSWORD_LOG (chmod 600)..."
umask 077
printf '%s\n' "$NEW_PASS" >"$PASSWORD_LOG"
chmod 600 "$PASSWORD_LOG"
echo "[ok] New password also printed at the end of this script — copy it to a password manager."

echo "[*] Terminating any open psql sessions (attacker may still be connected)..."
docker compose exec -T db psql -U postgres -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND usename = 'postgres';" \
  >/dev/null || true
echo "[ok] Terminated."

echo "[*] Resetting Postgres user password inside the container..."
docker compose exec -T db psql -U postgres -d postgres -c \
  "ALTER USER postgres WITH PASSWORD '$NEW_PASS';" >/dev/null
echo "[ok] Postgres password changed."

echo "[*] Updating .env (POSTGRES_PASSWORD + cleanup of misleading DATABASE_URL)..."
# Backup .env first
cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d_%H%M%S)"

# Update or insert POSTGRES_PASSWORD
if grep -qE '^POSTGRES_PASSWORD=' "$ENV_FILE"; then
  # Escape any | in password just in case (we control charset, so no |, but defensive)
  ESCAPED=$(printf '%s' "$NEW_PASS" | sed 's/[\/&|]/\\&/g')
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$ESCAPED|" "$ENV_FILE"
else
  printf '\nPOSTGRES_PASSWORD=%s\n' "$NEW_PASS" >>"$ENV_FILE"
fi

# Comment out misleading DATABASE_URL=...@localhost:... if present (we use compose env override)
sed -i 's|^DATABASE_URL=postgresql://.*@localhost.*|# &|' "$ENV_FILE"

chmod 600 "$ENV_FILE"
echo "[ok] .env updated, mode 600. Backup saved as $ENV_FILE.bak.*"

echo "[*] Recreating db container to apply new port binding..."
docker compose up -d db
sleep 3
echo "[ok] db container recreated."

echo "[*] Recreating app container so it picks up the new password..."
docker compose up -d app
sleep 5
echo "[ok] app container recreated."

echo "[*] Verifying port 5432 binding..."
if docker compose port db 5432 | grep -q '^127\.0\.0\.1:5432$'; then
  echo "[ok] db port published only on 127.0.0.1."
else
  echo "[!] Port binding looks wrong: $(docker compose port db 5432 || true)" >&2
fi

echo "[*] Smoke checks..."
echo "    psql connection from app's perspective:"
docker compose exec -T db psql -U postgres -d postgres -c "SELECT current_user, inet_server_addr();" || true
echo
echo "    db logs (last 5 lines):"
docker compose logs --tail=5 db || true
echo
echo "    app logs (last 10 lines):"
docker compose logs --tail=10 app || true

cat <<EOF

================================================================================
DONE. Summary:
  * Postgres port:     127.0.0.1:5432 (no longer exposed to the internet)
  * Postgres password: rotated; new value saved to $PASSWORD_LOG (mode 600)
  * .env updated and backed up (.env.bak.*)

NEW PASSWORD (also stored in $PASSWORD_LOG):
  $NEW_PASS

NEXT STEPS:
  1. Copy the password above to a password manager (1Password / Bitwarden).
  2. Wait for the Timeweb support response about a pre-incident backup.
  3. While waiting, the site will still show 500 on data endpoints because
     the nhatrang_map database does not exist yet. We will either restore
     it from a Timeweb backup or initialise an empty one — that decision
     comes AFTER support replies.
================================================================================
EOF
