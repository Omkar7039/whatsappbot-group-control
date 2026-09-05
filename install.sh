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

echo "[1/6] Checking operating system..."

if [[ -f /etc/redhat-release ]]; then
    echo "OS: $(cat /etc/redhat-release)"
else
    echo "WARNING: This installer is designed for RHEL 9."
fi

echo
echo "[2/6] Checking Node.js..."

if command -v node >/dev/null 2>&1; then

    NODE_VERSION="$(node --version)"
    NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"

    echo "Node.js already installed: $NODE_VERSION"

else

    echo "Node.js not found."
    echo "Installing Node.js 20 from RHEL AppStream..."

    command -v dnf >/dev/null 2>&1 || \
        fail "dnf is required to install Node.js."

    if [[ -f /etc/redhat-release ]] &&
       grep -q "Red Hat Enterprise Linux release 9" /etc/redhat-release; then

        dnf module enable -y nodejs:20
        dnf install -y nodejs

    else
        fail "Automatic Node.js installation is currently supported only for RHEL 9."
    fi

    command -v node >/dev/null 2>&1 || \
        fail "Node.js installation failed."

    NODE_VERSION="$(node --version)"
    NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"

    echo "Node.js installed: $NODE_VERSION"
fi

if (( NODE_MAJOR < 20 )); then
    fail "Node.js 20 or newer is required. Found $NODE_VERSION."
fi

command -v npm >/dev/null 2>&1 || \
    fail "npm is not installed."

echo "npm: $(npm --version)"

echo
echo "[3/6] Checking required project files..."

[[ -f "$APP_DIR/package.json" ]] || \
    fail "package.json missing."

[[ -f "$APP_DIR/package-lock.json" ]] || \
    fail "package-lock.json missing."

[[ -f "$APP_DIR/group-message-control/group-message-control.js" ]] || \
    fail "group-message-control.js missing."

[[ -f "$APP_DIR/group-message-control/groups/group_name.txt" ]] || \
    fail "group_name.txt missing."

echo "Required files: OK"

echo
echo "[4/6] Installing exact npm dependencies..."

cd "$APP_DIR"

npm ci

echo
echo "[5/6] Verifying whatsapp-web.js..."

WWJS_VERSION="$(
    node -p "require('whatsapp-web.js/package.json').version"
)"

echo "whatsapp-web.js: $WWJS_VERSION"

if [[ "$WWJS_VERSION" != "1.34.7" ]]; then
    fail "Expected whatsapp-web.js 1.34.7, found $WWJS_VERSION."
fi

echo
echo "[6/6] Checking JavaScript..."

node --check \
    "$APP_DIR/group-message-control/group-message-control.js"

echo
echo "============================================================"
echo " INSTALLATION SUCCESSFUL"
echo "============================================================"
echo
echo "Node.js:"
echo "  $(node --version)"
echo
echo "npm:"
echo "  $(npm --version)"
echo
echo "whatsapp-web.js:"
echo "  $WWJS_VERSION"
echo
echo "Application:"
echo "  $APP_DIR"
echo
echo "Commands:"
echo "  start"
echo "  warning1"
echo "  warning2"
echo "  close"
echo
echo "First run:"
echo "  node group-message-control/group-message-control.js start"
echo
echo "A WhatsApp QR scan may be required on the first run."
echo
