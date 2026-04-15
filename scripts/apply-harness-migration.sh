#!/usr/bin/env bash
# One-shot applier for supabase/migrations/20260414_add_harness_tables.sql
# Uses the Supabase Management API via the CLI keychain token.
# Safe to run multiple times — the migration uses CREATE TABLE IF NOT EXISTS.

set -euo pipefail

PROJECT_REF="qafiyhrwegmdcpjbmslm"
MIGRATION_FILE="supabase/migrations/20260414_add_harness_tables.sql"

if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "Migration file not found: $MIGRATION_FILE" >&2
  exit 1
fi

TOKEN=$(security find-generic-password -s "Supabase CLI" -w 2>/dev/null | sed 's/^go-keyring-base64://' | base64 -d)
if [[ -z "$TOKEN" ]]; then
  echo "Could not read Supabase CLI token from Keychain." >&2
  exit 1
fi

SQL=$(cat "$MIGRATION_FILE")

PAYLOAD=$(node -e '
  const sql = require("fs").readFileSync(process.argv[1], "utf8");
  process.stdout.write(JSON.stringify({ query: sql }));
' "$MIGRATION_FILE")

RESPONSE=$(curl -sS -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "Response: $RESPONSE"
