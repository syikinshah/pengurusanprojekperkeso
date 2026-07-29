#!/usr/bin/env bash
# =============================================================================
# 🚀 Deploy Script — LMS-ITS PERKESO
# Sistem Pengurusan Pembelajaran & Penjejakan Pembayaran Invois
# =============================================================================
#
# Skrip ini menempatkan kod ke repositori GitHub anda:
#   https://github.com/syikinshah/pengurusanprojekperkeso.git
#
# === CARA GUNA ===
#
#   Pilihan A (disyorkan — guna Personal Access Token):
#     ./deploy.sh ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
#
#   Pilihan B (gunakan kredensial GitHub anda secara interaktif):
#     ./deploy.sh
#
# === PRASYARAT ===
#   - Git telah dipasang
#   - Akses tulis ke repositori: syikinshah/pengurusanprojekperkeso
#   - GitHub Personal Access Token (PAT) dengan skop 'repo' — jika guna Pilihan A
#     Cipta di: https://github.com/settings/tokens
#
# === PASCA-DEPLOY ===
#   Repositori akan mengandungi:
#     - Kod penuh LMS-ITS (Next.js 16 + TypeScript + Prisma)
#     - Pangkalan data dummy (db/custom.db) dengan data seeded
#     - README.md lengkap dengan arahan pemasangan
#     - 3 commit: Initial commit → kod LMS-ITS → README
# =============================================================================

set -e

REMOTE_URL="https://github.com/syikinshah/pengurusanprojekperkeso.git"
BUNDLE_FILE="lms-its-perkeso.bundle"

# --- Banner ---------------------------------------------------------------
cat << 'BANNER'
  ╔══════════════════════════════════════════════════════════════════╗
  ║   LMS-ITS PERKESO — Deploy ke GitHub                            ║
  ║   Sistem Pengurusan Pembelajaran & Penjejakan Invois             ║
  ╚══════════════════════════════════════════════════════════════════╝
BANNER

# --- Locate bundle file ---------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE_PATH="${SCRIPT_DIR}/${BUNDLE_FILE}"

if [ ! -f "$BUNDLE_PATH" ]; then
  echo "❌ Fail bundle tidak dijumpai: $BUNDLE_PATH"
  echo "   Sila pastikan 'lms-its-perkeso.bundle' berada di folder yang sama dengan skrip ini."
  exit 1
fi

# --- Create temp working directory ----------------------------------------
WORK_DIR="$(mktemp -d /tmp/lms-its-deploy.XXXXXX)"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "📂 Direktori kerja sementara: $WORK_DIR"
echo ""

# --- Clone from bundle ----------------------------------------------------
echo "📥 Mengklon dari bundle..."
git clone "$BUNDLE_PATH" "$WORK_DIR/repo" 2>&1 | sed 's/^/   /'
cd "$WORK_DIR/repo"
git checkout main 2>&1 | sed 's/^/   /'
echo ""

# --- Set remote -----------------------------------------------------------
echo "🔗 Menetapkan remote ke: $REMOTE_URL"
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL"
echo ""

# --- Authenticate ----------------------------------------------------------
TOKEN="$1"
if [ -n "$TOKEN" ]; then
  echo "🔐 Menggunakan Personal Access Token yang dibekalkan..."
  # Inject token into remote URL (format: https://oauth2:TOKEN@github.com/...)
  AUTH_URL="https://oauth2:${TOKEN}@github.com/syikinshah/pengurusanprojekperkeso.git"
  git remote set-url origin "$AUTH_URL"
else
  echo "🔐 Tiada token dibekalkan. Git akan meminta kredensial secara interaktif."
  echo "   (Pastikan anda mempunyai akses tulis ke repositori tersebut)"
fi
echo ""

# --- Push -----------------------------------------------------------------
echo "🚀 Menempatkan kod ke GitHub..."
echo ""
if git push -u origin main 2>&1 | sed 's/^/   /'; then
  echo ""
  echo "✅ Berjaya! Kod telah ditempatkan ke:"
  echo "   https://github.com/syikinshah/pengurusanprojekperkeso"
  echo ""
  echo "📊 Ringkasan commit yang ditempatkan:"
  git log --oneline -5 | sed 's/^/   /'
  echo ""
  echo "🗂️  Fail yang ditempatkan: $(git ls-files | wc -l) fail"
  echo ""
  echo "🎉 Sistem LMS-ITS PERKESO kini tersedia di GitHub anda!"
else
  echo ""
  echo "❌ Penempatan gagal. Sila semak:"
  echo "   1. Token PAT anda sah & mempunyai skop 'repo'"
  echo "   2. Repositori wujud: https://github.com/syikinshah/pengurusanprojekperkeso"
  echo "   3. Anda mempunyai akses tulis ke repositori tersebut"
  echo ""
  echo "Untuk mencipta PAT: https://github.com/settings/tokens (pilih skop 'repo')"
  exit 1
fi
