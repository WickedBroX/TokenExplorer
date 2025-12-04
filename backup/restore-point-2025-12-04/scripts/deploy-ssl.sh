#!/bin/bash
# ZeroSSL certificate deployment helper for 159.198.46.117
# Copies the provided certificate bundle to /etc/ssl and provisions the nginx
# vhost to serve HTTPS for the frontend and proxy the backend.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_DOMAIN="bazaars.io"

SERVER="${SERVER:-root@159.198.46.117}"
DOMAIN="${DOMAIN:-$DEFAULT_DOMAIN}"
SSL_DIR="${SSL_DIR:-$PROJECT_ROOT/SSL/$DOMAIN}"
REMOTE_CERT_DIR="${REMOTE_CERT_DIR:-/etc/ssl/$DOMAIN}"
REMOTE_KEY_PATH="${REMOTE_KEY_PATH:-/etc/ssl/private/$DOMAIN.key}"
NGINX_SITE_PATH="${NGINX_SITE_PATH:-/etc/nginx/sites-available/$DOMAIN.conf}"

echo "🚀 Installing ZeroSSL certificate for ${DOMAIN} on ${SERVER}"
echo "🗂  Using SSL source directory: ${SSL_DIR}"

# Ensure all required files are present locally
for FILE in certificate.crt ca_bundle.crt private.key; do
  if [[ ! -f "${SSL_DIR}/${FILE}" ]]; then
    echo "❌ Missing ${FILE} in ${SSL_DIR}"
    exit 1
  fi
done

echo "📤 Uploading certificate files to server..."
ssh "$SERVER" "mkdir -p ${REMOTE_CERT_DIR} /etc/ssl/private"
scp "${SSL_DIR}/certificate.crt" "${SERVER}:${REMOTE_CERT_DIR}/certificate.crt"
scp "${SSL_DIR}/ca_bundle.crt" "${SERVER}:${REMOTE_CERT_DIR}/ca_bundle.crt"
scp "${SSL_DIR}/private.key" "${SERVER}:${REMOTE_KEY_PATH}"
ssh "$SERVER" "chmod 600 ${REMOTE_KEY_PATH} && chown root:root ${REMOTE_KEY_PATH}"

echo "⚙️  Writing nginx config and reloading..."
ssh "$SERVER" "DOMAIN=${DOMAIN} REMOTE_CERT_DIR=${REMOTE_CERT_DIR} REMOTE_KEY_PATH=${REMOTE_KEY_PATH} NGINX_SITE_PATH=${NGINX_SITE_PATH} bash -s" <<'ENDSSH'
set -euo pipefail

cat > "$NGINX_SITE_PATH" <<NGINXCONF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate ${REMOTE_CERT_DIR}/certificate.crt;
    ssl_certificate_key ${REMOTE_KEY_PATH};
    ssl_trusted_certificate ${REMOTE_CERT_DIR}/ca_bundle.crt;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    root /var/www/bzr-frontend;
    index index.html;

    location / {
        try_files \$uri /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXCONF

ln -sf "$NGINX_SITE_PATH" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
nginx -t
systemctl reload nginx
ENDSSH

echo "✅ SSL deployed. Verify at https://${DOMAIN}"
