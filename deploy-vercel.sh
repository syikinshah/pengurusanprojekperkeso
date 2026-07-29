#!/usr/bin/env bash
# =============================================================================
# 🚀 Deploy to Vercel — LMS-ITS PERKESO
# =============================================================================
#
# CARA GUNA:
#   ./deploy-vercel.sh                    # Login interaktif (browser)
#   ./deploy-vercel.sh <VERCEL_TOKEN>     # Gunakan Vercel token
#
# Token dicipta di: https://vercel.com/account/tokens
# =============================================================================

set -e

cd "$(dirname "$0")"

TOKEN="$1"
echo "🚀 Deploying LMS-ITS PERKESO to Vercel..."
echo ""

# Authenticate
if [ -n "$TOKEN" ]; then
  echo "🔐 Using provided Vercel token..."
  VERCEL_TOKEN="$TOKEN" vercel whoami 2>&1 | tail -2
  DEPLOY_CMD="VERCEL_TOKEN='$TOKEN' vercel"
else
  echo "🔐 Please login to Vercel..."
  vercel login
  DEPLOY_CMD="vercel"
fi
echo ""

# Link project (creates .vercel/ config)
echo "🔗 Linking project..."
$DEPLOY_CMD link --yes 2>&1 | tail -3
echo ""

# Set environment variables from .env
echo "🌍 Setting environment variables..."
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  # Remove any quotes from value
  value="${value%\"}"
  value="${value#\"}"
  # Only set main vars (skip commented alternates)
  if [[ "$key" == "DATABASE_URL" ]] || [[ "$key" == SUPABASE_* ]]; then
    echo "   Setting $key..."
    $DEPLOY_CMD env add "$key" production 2>/dev/null <<< "$value" || true
  fi
done < .env
echo ""

# Deploy to production
echo "📦 Deploying to production..."
$DEPLOY_CMD --prod --yes 2>&1 | tail -20
echo ""
echo "✅ Deployment complete!"
echo "   Check the URL output above for your live site."
