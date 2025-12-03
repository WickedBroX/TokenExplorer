# SSL Installation (ZeroSSL, Ubuntu)

This follows the ZeroSSL Ubuntu guide using the certificate bundle now in `SSL/bazaars.io`. The helper script copies the bundle to `/etc/ssl` and configures nginx to serve HTTPS for the app.

## Prerequisites
- Root SSH access to the production server (`root@159.198.46.117` by default).
- Certificate files present locally: `SSL/bazaars.io/certificate.crt`, `ca_bundle.crt`, `private.key`.
- Backend already listening on `localhost:3001` and frontend files deployed to `/var/www/bzr-frontend`.

## Install or renew the certificate
```bash
cd /Users/wickedbro/Desktop/TokenExplorer
# Optional overrides: DOMAIN=example.com SERVER=root@your_ip
./scripts/deploy-ssl.sh
```

What the script does:
- Copies `certificate.crt` and `ca_bundle.crt` to `/etc/ssl/<domain>/` and `private.key` to `/etc/ssl/private/<domain>.key` (matches the ZeroSSL guide placement).
- Writes `/etc/nginx/sites-available/<domain>.conf` with:
  - HTTP → HTTPS redirect
  - `ssl_certificate`, `ssl_certificate_key`, and `ssl_trusted_certificate` pointing at the uploaded files
  - Frontend root `/var/www/bzr-frontend` and `/api` proxy to `http://localhost:3001`
- Symlinks the site in `/etc/nginx/sites-enabled/`, runs `nginx -t`, then reloads nginx.

## Validate
- `ssh root@159.198.70.88 "nginx -t && systemctl status nginx --no-pager | head"`
- `curl -I https://bazaars.io` (or your domain) should return `HTTP/2 200`.
- Browser check: https://bazaars.io should load without certificate warnings.
