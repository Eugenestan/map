#!/usr/bin/env bash
# Reset admin email + password for /admin login.
#
# Generates a fresh scrypt hash matching the format expected by
# src/lib/admin-auth.ts (salt:hash, salt = 16 random bytes hex,
# hash = scryptSync(password, salt, 64) hex). Updates ADMIN_EMAIL,
# ADMIN_PASSWORD_HASH and (if missing) ADMIN_SESSION_SECRET in
# /opt/nhatrang-map/.env, then recreates the app container so it
# picks up the new values.
#
# Usage (interactive — recommended, nothing lands in bash history):
#   cd /opt/nhatrang-map
#   bash deploy/set-admin-credentials.sh
#
# The script prompts for:
#   * Admin email
#   * Password (hidden input, asked twice for confirmation)
#
# Idempotent: safe to re-run any time you want to rotate credentials.

set -euo pipefail

if [[ ! -f compose.yaml || ! -f .env ]]; then
  echo "[!] Run this from /opt/nhatrang-map (compose.yaml and .env must be here)." >&2
  exit 1
fi

ENV_FILE=".env"

# ----- Inputs -----
read -rp "Admin email: " ADMIN_EMAIL_IN
ADMIN_EMAIL_IN=$(echo "$ADMIN_EMAIL_IN" | tr '[:upper:]' '[:lower:]' | xargs)
if [[ -z "$ADMIN_EMAIL_IN" || "$ADMIN_EMAIL_IN" != *"@"* ]]; then
  echo "[!] Bad email." >&2
  exit 1
fi

read -rsp "New password (min 8 chars): " PASSWORD_IN
echo
if [[ ${#PASSWORD_IN} -lt 8 ]]; then
  echo "[!] Password too short." >&2
  exit 1
fi

read -rsp "Confirm password: " PASSWORD_CONFIRM
echo
if [[ "$PASSWORD_IN" != "$PASSWORD_CONFIRM" ]]; then
  echo "[!] Passwords do not match." >&2
  exit 1
fi

# ----- Generate hash inside app container (Node.js available there) -----
echo "[*] Generating scrypt hash..."

# Pass password via stdin so it doesn't appear in process args or env.
HASH=$(printf '%s' "$PASSWORD_IN" | docker compose exec -T app node -e '
  const { randomBytes, scryptSync } = require("crypto");
  let pwd = "";
  process.stdin.on("data", (chunk) => { pwd += chunk.toString(); });
  process.stdin.on("end", () => {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(pwd, salt, 64).toString("hex");
    process.stdout.write(salt + ":" + hash);
  });
')

if [[ -z "$HASH" || "$HASH" != *":"* || ${#HASH} -lt 64 ]]; then
  echo "[!] Hash generation failed. Got: \"$HASH\"" >&2
  exit 1
fi
echo "[ok] Hash generated (${#HASH} chars)."

# ----- Generate ADMIN_SESSION_SECRET if it's missing or placeholder -----
CURRENT_SECRET=$(grep -E '^ADMIN_SESSION_SECRET=' "$ENV_FILE" | sed 's/^ADMIN_SESSION_SECRET=//' | tr -d '"' || true)
NEED_NEW_SECRET=0
if [[ -z "$CURRENT_SECRET" || "$CURRENT_SECRET" == "replace_with_a_long_random_secret" || ${#CURRENT_SECRET} -lt 32 ]]; then
  NEED_NEW_SECRET=1
  NEW_SECRET=$(openssl rand -hex 32)
  echo "[*] ADMIN_SESSION_SECRET missing or weak — generating a new one."
fi

# ----- Backup .env and patch it -----
BACKUP="$ENV_FILE.bak.$(date +%Y%m%d_%H%M%S)"
cp "$ENV_FILE" "$BACKUP"
echo "[ok] Backed up $ENV_FILE → $BACKUP"

# helper: set or insert KEY=value (uses | as sed separator; escapes &, |, \)
set_env() {
  local key="$1"
  local value="$2"
  local escaped_value
  escaped_value=$(printf '%s' "$value" | sed 's/[&|\\]/\\&/g')
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${escaped_value}|" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi
}

set_env "ADMIN_EMAIL" "$ADMIN_EMAIL_IN"
set_env "ADMIN_PASSWORD_HASH" "$HASH"
if [[ "$NEED_NEW_SECRET" == "1" ]]; then
  set_env "ADMIN_SESSION_SECRET" "$NEW_SECRET"
fi

chmod 600 "$ENV_FILE"
echo "[ok] .env patched."

# Verify the patch actually took effect — guards against silent sed failures.
ACTUAL_EMAIL=$(grep -E '^ADMIN_EMAIL=' "$ENV_FILE" | head -1 | sed 's/^ADMIN_EMAIL=//')
ACTUAL_HASH=$(grep -E '^ADMIN_PASSWORD_HASH=' "$ENV_FILE" | head -1 | sed 's/^ADMIN_PASSWORD_HASH=//')
if [[ "$ACTUAL_EMAIL" != "$ADMIN_EMAIL_IN" ]]; then
  echo "[!] ADMIN_EMAIL in .env is '$ACTUAL_EMAIL', expected '$ADMIN_EMAIL_IN'." >&2
  echo "    Restoring backup: $BACKUP" >&2
  cp "$BACKUP" "$ENV_FILE"
  exit 1
fi
if [[ "$ACTUAL_HASH" != "$HASH" ]]; then
  echo "[!] ADMIN_PASSWORD_HASH in .env did not update (len ${#ACTUAL_HASH}, expected ${#HASH})." >&2
  echo "    Restoring backup: $BACKUP" >&2
  cp "$BACKUP" "$ENV_FILE"
  exit 1
fi
echo "[ok] .env values verified."

# ----- Restart app container -----
echo "[*] Recreating app container so it picks up the new env..."
docker compose up -d app
sleep 5
echo "[ok] app recreated."

echo
echo "================================================================================"
echo "DONE."
echo "  * Admin email:      $ADMIN_EMAIL_IN"
echo "  * Password:         set (hidden, store it in your password manager NOW)"
if [[ "$NEED_NEW_SECRET" == "1" ]]; then
  echo "  * Session secret:   regenerated (all existing admin sessions invalidated)"
fi
echo "  * .env backup:      $BACKUP"
echo
echo "  Test login at:"
echo "    https://vietradar.com/admin"
echo "================================================================================"
