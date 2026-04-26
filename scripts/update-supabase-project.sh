#!/usr/bin/env bash
set -euo pipefail

# Updates Supabase resources for this repo using local .env values.
# - Links CLI to your project
# - Pushes DB migrations
# - Updates Edge Function secrets (optional)
# - Deploys broadcast-push
#
# Usage:
#   scripts/update-supabase-project.sh [--project-ref <ref>] [--firebase-json-file <path>] [--push-webhook-secret <secret>]
#
# Environment:
#   Reads .env from repo root (must include VITE_SUPABASE_URL and VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_PUBLISHABLE_KEY)
#   Optional env vars:
#     PUSH_WEBHOOK_SECRET
#     FIREBASE_SERVICE_ACCOUNT_JSON
#     FIREBASE_SERVICE_ACCOUNT_JSON_FILE

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROJECT_REF="${VITE_SUPABASE_PROJECT_ID:-}"
FIREBASE_JSON_FILE="${FIREBASE_SERVICE_ACCOUNT_JSON_FILE:-}"
PUSH_SECRET="${PUSH_WEBHOOK_SECRET:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-ref)
      PROJECT_REF="${2:-}"
      shift 2
      ;;
    --firebase-json-file)
      FIREBASE_JSON_FILE="${2:-}"
      shift 2
      ;;
    --push-webhook-secret)
      PUSH_SECRET="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ ! -f ".env" ]]; then
  echo "Missing .env in repo root. Copy .env.example -> .env first."
  exit 1
fi

# Export .env vars for this script only.
set -a
# shellcheck disable=SC1091
source ".env"
set +a

if [[ -z "${PROJECT_REF}" ]]; then
  PROJECT_REF="${VITE_SUPABASE_PROJECT_ID:-}"
fi

if [[ -z "${PROJECT_REF}" && -n "${VITE_SUPABASE_URL:-}" ]]; then
  # Extract "xxxx" from https://xxxx.supabase.co
  PROJECT_REF="$(echo "$VITE_SUPABASE_URL" | sed -E 's#https?://([^.]+)\.supabase\.co/?#\1#')"
fi

if [[ -z "${PROJECT_REF}" ]]; then
  echo "Could not determine project ref. Set VITE_SUPABASE_PROJECT_ID in .env or pass --project-ref."
  exit 1
fi

if [[ -z "${VITE_SUPABASE_URL:-}" || -z "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ]]; then
  echo ".env must include VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."
  exit 1
fi

if [[ -z "${FIREBASE_JSON_FILE}" && -n "${FIREBASE_SERVICE_ACCOUNT_JSON_FILE:-}" ]]; then
  FIREBASE_JSON_FILE="${FIREBASE_SERVICE_ACCOUNT_JSON_FILE}"
fi

echo "==> Linking Supabase CLI to project: ${PROJECT_REF}"
npx supabase link --project-ref "${PROJECT_REF}"

echo "==> Pushing DB migrations"
npx supabase db push

if [[ -n "${PUSH_SECRET}" ]]; then
  echo "==> Setting PUSH_WEBHOOK_SECRET"
  npx supabase secrets set PUSH_WEBHOOK_SECRET="${PUSH_SECRET}" --project-ref "${PROJECT_REF}"
else
  echo "==> Skipping PUSH_WEBHOOK_SECRET (not provided)"
fi

if [[ -n "${FIREBASE_SERVICE_ACCOUNT_JSON:-}" ]]; then
  echo "==> Setting FIREBASE_SERVICE_ACCOUNT_JSON from env var"
  npx supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON="${FIREBASE_SERVICE_ACCOUNT_JSON}" --project-ref "${PROJECT_REF}"
elif [[ -n "${FIREBASE_JSON_FILE}" ]]; then
  if [[ ! -f "${FIREBASE_JSON_FILE}" ]]; then
    echo "Firebase JSON file not found: ${FIREBASE_JSON_FILE}"
    exit 1
  fi
  echo "==> Setting FIREBASE_SERVICE_ACCOUNT_JSON from file: ${FIREBASE_JSON_FILE}"
  FIREBASE_JSON_MINIFIED="$(node -e 'const fs=require("fs"); const p=process.argv[1]; const x=JSON.parse(fs.readFileSync(p, "utf8")); process.stdout.write(JSON.stringify(x));' "${FIREBASE_JSON_FILE}")"
  npx supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON="${FIREBASE_JSON_MINIFIED}" --project-ref "${PROJECT_REF}"
else
  echo "==> Skipping FIREBASE_SERVICE_ACCOUNT_JSON (not provided)"
fi

echo "==> Deploying Edge Function: broadcast-push"
npx supabase functions deploy broadcast-push --no-verify-jwt --project-ref "${PROJECT_REF}"

if [[ -n "${PUSH_SECRET}" ]]; then
  echo
  echo "Run this SQL in Supabase SQL Editor (same project) to sync app_config:"
  cat <<EOF
insert into public.app_config (key, value)
values
  ('push_edge_function_url', 'https://${PROJECT_REF}.supabase.co/functions/v1/broadcast-push'),
  ('push_webhook_secret', '${PUSH_SECRET}')
on conflict (key) do update
set value = excluded.value, updated_at = now();
EOF
fi

echo
echo "Done. Next: test by inserting a message and checking push_attempts + function logs."
