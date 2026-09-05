#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================================"
echo " WhatsApp Group Message Control"
echo " Installation"
echo "============================================================"
echo

fail() {
    echo
    echo "INSTALLATION FAILED: $1"
    exit 1
}

command -v node >/dev/null 2>&1 || \
    fail "Node.js is not installed."

command -v npm >/dev/null 2>&1 || \
    fail "npm is not installed."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"

echo "Node.js : $(node --version)"
echo "npm     : $(npm --version)"

if (( NODE_MAJOR < 20 )); then
    fail "Node.js 20 or newer is required."
fi

[[ -f "$APP_DIR/package.json" ]] || \
    fail "package.json missing."

[[ -f "$APP_DIR/package-lock.json" ]] || \
    fail "package-lock.json missing."

[[ -f "$APP_DIR/group-message-control/group-message-control.js" ]] || \
    fail "group-message-control.js missing."

[[ -f "$APP_DIR/group-message-control/groups/group_name.txt" ]] || \
    fail "group_name.txt missing."

echo
echo "[1/3] Installing exact dependencies..."
cd "$APP_DIR"
npm ci

echo
echo "[2/3] Verifying whatsapp-web.js..."

WWJS_VERSION="$(
    node -p "require('whatsapp-web.js/package.json').version"
)"

echo "whatsapp-web.js: $WWJS_VERSION"

[[ "$WWJS_VERSION" == "1.34.7" ]] || \
    fail "Expected whatsapp-web.js 1.34.7."

echo
echo "[3/3] Checking JavaScript..."

node --check \
    "$APP_DIR/group-message-control/group-message-control.js"

echo
echo "============================================================"
echo " INSTALLATION SUCCESSFUL"
echo "============================================================"
echo
echo "Run:"
echo "  node group-message-control/group-message-control.js start"
echo
echo "Commands:"
echo "  start"
echo "  warning1"
echo "  warning2"
echo "  close"
echo
echo "First run may require a WhatsApp QR scan."
echo
