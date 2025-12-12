#!/bin/bash

# Frontend Deployment Script
# Builds the frontend and deploys it to the production server

set -e # Exit on error

SERVER_USER="${SERVER_USER:-root}"
SERVER_HOST="${SERVER_HOST:-159.198.46.117}"
SERVER="$SERVER_USER@$SERVER_HOST"
SSH_PASSWORD="${SSH_PASSWORD:-}"
SSH_IDENTITY_FILE="${SSH_IDENTITY_FILE:-}"
SSH_KEY_PASSPHRASE="${SSH_KEY_PASSPHRASE:-}"

SSH_BASE_OPTS=(-o StrictHostKeyChecking=no)
if [[ -n "$SSH_IDENTITY_FILE" ]]; then
  SSH_BASE_OPTS+=(-i "$SSH_IDENTITY_FILE" -o IdentitiesOnly=yes)
fi

# Load passphrase-protected key into agent if requested.
if [[ -n "$SSH_IDENTITY_FILE" && -n "$SSH_KEY_PASSPHRASE" ]]; then
  if command -v ssh-agent >/dev/null 2>&1 && command -v ssh-add >/dev/null 2>&1; then
    eval "$(ssh-agent -s)" >/dev/null
    ASKPASS_SCRIPT="$(mktemp)"
    cat >"$ASKPASS_SCRIPT" <<'EOF'
#!/bin/sh
echo "$SSH_KEY_PASSPHRASE"
EOF
    chmod 700 "$ASKPASS_SCRIPT"
    SSH_ASKPASS="$ASKPASS_SCRIPT" SSH_ASKPASS_REQUIRE=force DISPLAY=1 \
      setsid ssh-add "$SSH_IDENTITY_FILE" </dev/null >/dev/null 2>&1 || true
    rm -f "$ASKPASS_SCRIPT"
  fi
fi

RSYNC_RSH="ssh ${SSH_BASE_OPTS[*]}"
if [[ -n "$SSH_PASSWORD" ]]; then
  RSYNC_RSH="sshpass -p $SSH_PASSWORD ssh ${SSH_BASE_OPTS[*]}"
fi

echo "🚀 Starting Frontend Deployment..."

# 1. Build the frontend
echo "📦 Building frontend..."
cd bzr-frontend
npm run build

# 2. Deploy to server
echo "📤 Deploying to production (${SERVER_HOST})..."
rsync -avz --delete -e "$RSYNC_RSH" ./dist/ $SERVER:/var/www/bzr-frontend/

echo "✅ Frontend deployment complete!"
echo "👉 Visit https://bazaars.io to verify changes."
