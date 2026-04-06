#!/bin/bash
# Generates .env files for local development from supabase status.
# Run this after `supabase start`.

set -e

# Check supabase is running
if ! supabase status > /dev/null 2>&1; then
  echo "Error: Supabase is not running. Run 'supabase start' first."
  exit 1
fi

# Parse supabase status into variables
eval "$(supabase status -o env 2>/dev/null)"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Backend: appsettings.Development.json
cat > "$ROOT_DIR/backend/appsettings.Development.json" <<EOF
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "$DB_URL"
  },
  "Supabase": {
    "Url": "$API_URL",
    "AnonKey": "$ANON_KEY"
  }
}
EOF

# Frontend: .env.development.local
cat > "$ROOT_DIR/frontend/.env.development.local" <<EOF
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=$API_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY
EOF

echo "Done! Generated:"
echo "  backend/appsettings.Development.json"
echo "  frontend/.env.development.local"
