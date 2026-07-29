#!/bin/bash
# ================================================================
# Local Development Setup (SQLite) — for sandbox/preview environments
# ================================================================
# The production code uses Supabase PostgreSQL (see .env).
# For local sandbox preview where Supabase is unreachable (IPv6),
# this script temporarily switches to SQLite.
#
# Usage:  bash dev-sqlite.sh
# ================================================================

set -e
cd /home/z/my-project

echo "🔄 Switching to SQLite for local development..."
# Temporarily change the Prisma provider to sqlite
sed -i.bak 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma

# Generate Prisma client for SQLite
DATABASE_URL="file:/home/z/my-project/db/custom.db" bun run db:generate

# Push schema to SQLite if needed
DATABASE_URL="file:/home/z/my-project/db/custom.db" bun run db:push 2>&1 | tail -3

# Start dev server with SQLite
echo "🚀 Starting dev server (SQLite) on port 3000..."
DATABASE_URL="file:/home/z/my-project/db/custom.db" bun run dev
