# Backend Deployment Guide for 159.198.70.88 (haswork.dev)

## Current Issue:
❌ **Backend server is not running** - causing 502 errors on haswork.dev  
✅ Frontend is deployed and working  
✅ Backend files exist on server but process is stopped

---

## Recommended: Systemd Deployment (Automated)

**Prerequisites**

1. Provision a PostgreSQL database and load credentials into `/var/www/bzr-backend/.env` using the fields defined in `.env.example`:
   - `TRANSFERS_DATABASE_URL` **or** `TRANSFERS_DB_HOST`, `TRANSFERS_DB_USER`, etc.
   - `TRANSFERS_DATA_SOURCE=store`
   - Optional tuning: `TRANSFERS_INGEST_INTERVAL_MS`, `TRANSFERS_INGEST_CONCURRENCY`, `TRANSFERS_STALE_THRESHOLD_SECONDS`
2. Confirm the `.env` also contains API keys (`ETHERSCAN_V2_API_KEY`, `CRONOS_API_KEY`) and the new `INGESTER_SUPERVISOR=systemd` flag.

Run this from your local machine:

```bash
cd /Users/wickedbro/Desktop/TokenExplorer
./deploy-backend.sh
```

With `USE_SYSTEMD=1` (the default), the script will:

1. Upload the backend sources (including systemd unit files and startup scripts).
2. Install/update dependencies on the server.
3. Copy `bzr-backend.service` and `bzr-ingester.service` to `/etc/systemd/system`.
4. Reload systemd, enable both services, and restart them.
5. Probe `http://localhost:3001/api/info` and `/api/health` to verify the deployment.

### Managing Services

Check status:

```bash
ssh root@159.198.70.88 "systemctl status bzr-backend bzr-ingester"
```

Tail logs (uses journalctl):

```bash
ssh root@159.198.70.88 "journalctl -u bzr-backend -u bzr-ingester -n 200 --no-pager"
```

Restart services:

```bash
ssh root@159.198.70.88 "systemctl restart bzr-backend bzr-ingester"
```

Once the ingester is running and the persistent store has data, `/api/health` will report `status: "ok"` with per-chain lag and last-success timestamps.

### Seeding the Persistent Store

Run the seeding utility after provisioning Postgres (or whenever you need to resync recent transfers without waiting for the ingester to catch up):

```bash
ssh root@159.198.70.88 \
   ". /root/.nvm/nvm.sh && cd /var/www/bzr-backend && node scripts/seed-transfers.js"
```

Useful flags:

- `--pages=<n>` (default `10`): how many pages per chain to fetch (page size defaults to 100).
- `--chains=<ids>`: restricts seeding to specific chain IDs (comma-separated, e.g. `--chains=137,8453`).
- `--concurrency=<n>`: limit parallel chains (use `1` if hitting upstream rate limits).
- `--dry-run`: preview what would be inserted without touching the database.

Example to reseed Polygon and Base with 5 pages each:

```bash
ssh root@159.198.70.88 \
   ". /root/.nvm/nvm.sh && cd /var/www/bzr-backend && node scripts/seed-transfers.js --pages=5 --concurrency=1 --chains=137,8453"
```

---

## Quick Fix - Option 2: Use Deployment Script (No systemd)

Run this from your local machine:

```bash
cd /Users/wickedbro/Desktop/TokenExplorer
./deploy-backend.sh
```

This script will:
1. Upload latest backend code to server
2. Install dependencies (including new security packages)
3. Stop old backend process
4. Start new backend process
5. Test if API is responding

---

## Quick Fix - Option 2: Manual Deployment (Step by Step)

### Step 1: Upload Backend Code
```bash
cd /Users/wickedbro/Desktop/TokenExplorer
rsync -avz --delete --exclude 'node_modules' --exclude '.env' \
  ./bzr-backend/ root@159.198.70.88:/var/www/bzr-backend/
```

### Step 2: SSH into Server and Start Backend
```bash
ssh root@159.198.70.88
```

Then run these commands on the server:
```bash
# Navigate to backend directory
cd /var/www/bzr-backend

# Install/update dependencies
npm install

# Stop existing backend (if any)
pkill -f "node server.js"

# Start backend in background
nohup node server.js > /var/log/bzr-backend.log 2>&1 &

# Check if it's running
ps aux | grep "node server.js"

# Test API
curl http://localhost:3001/api/info

# Exit SSH
exit
```

### Step 3: Test Your Website
Visit: https://haswork.dev

The 502 error should be gone! ✅

---

## Troubleshooting

### Check if Backend is Running
```bash
ssh root@159.198.70.88 "ps aux | grep 'node server.js' | grep -v grep"
```

### View Backend Logs
```bash
ssh root@159.198.70.88 "tail -50 /var/log/bzr-backend.log"
```

### Test API Directly
```bash
ssh root@159.198.70.88 "curl http://localhost:3001/api/info"
ssh root@159.198.70.88 "curl http://localhost:3001/api/health"
```

### Restart Backend
```bash
ssh root@159.198.70.88 "pkill -f 'node server.js' && cd /var/www/bzr-backend && nohup node server.js > /var/log/bzr-backend.log 2>&1 &"
```

---

## Production Best Practice - Using PM2

For a more robust production setup, install PM2 on your server:

```bash
ssh root@159.198.70.88

# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd /var/www/bzr-backend
pm2 start server.js --name bzr-backend

# Save PM2 process list
pm2 save

# Setup PM2 to start on server reboot
pm2 startup

# View logs
pm2 logs bzr-backend

# Monitor
pm2 monit
```

### PM2 Commands
```bash
pm2 status              # Check status
pm2 restart bzr-backend # Restart
pm2 stop bzr-backend    # Stop
pm2 logs bzr-backend    # View logs
pm2 monit               # Live monitoring
```

---

## Complete Deployment Workflow

### When you make changes to backend:

1. **Build locally** (if needed):
   ```bash
   cd /Users/wickedbro/Desktop/TokenExplorer/bzr-backend
   npm install
   ```

2. **Deploy**:
   ```bash
   cd /Users/wickedbro/Desktop/TokenExplorer
   ./deploy-backend.sh
   ```

3. **Test**:
   - Visit https://haswork.dev
   - Check console for errors
   - Test API: https://haswork.dev/api/info

### When you make changes to frontend:

1. **Build**:
   ```bash
   cd /Users/wickedbro/Desktop/TokenExplorer/bzr-frontend
   npm run build
   ```

2. **Deploy**:
   ```bash
   rsync -avz --delete ./dist/ root@159.198.70.88:/var/www/bzr-frontend/
   ```

3. **Test**:
   - Visit https://haswork.dev (hard refresh: Cmd+Shift+R)

---

## Server Architecture

```
haswork.dev (Domain A record) 
    ↓
159.198.70.88 (Server)
    ↓
├── Nginx (Web Server)
│   ├── / → /var/www/bzr-frontend/ (Static files)
│   └── /api/* → http://localhost:3001 (Proxy to backend)
│
└── Node.js Backend
    └── localhost:3001 (API server)
```

---

## Checklist After Deployment

- [ ] Backend process is running: `ps aux | grep node`
- [ ] Backend responds: `curl http://localhost:3001/api/info`
- [ ] Frontend deployed: Files in `/var/www/bzr-frontend/`
- [ ] Website loads: https://haswork.dev
- [ ] No console errors in browser
- [ ] API calls working (check Network tab)

---

## Common Issues

### Issue: "npm: command not found"
**Solution**: Node/npm not in PATH. Use full path or load NVM:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### Issue: "Address already in use"
**Solution**: Port 3001 is occupied. Kill the process:
```bash
pkill -f "node server.js"
# or
lsof -ti:3001 | xargs kill -9
```

### Issue: Backend starts but crashes
**Solution**: Check logs and environment variables:
```bash
tail -50 /var/log/bzr-backend.log
cat /var/www/bzr-backend/.env
journalctl -u bzr-ingester -n 200 --no-pager
```

### Issue: 502 error persists
**Solution**: Check if Nginx is configured to proxy /api/* to backend:
```bash
cat /etc/nginx/sites-available/haswork.dev
nginx -t
systemctl restart nginx
```

---

## Environment Variables

Make sure `/var/www/bzr-backend/.env` contains:

```bash
ETHERSCAN_API_KEY=your_key_here
CRONOS_API_KEY=your_key_here
TOKEN_ADDRESS=0x431e0cD023a32532BF3969CddFc002c00E98429d
TOKEN_NAME=Beezer
TOKEN_SYMBOL=BZR
TOKEN_DECIMALS=18
PORT=3001
ALLOWED_ORIGINS=https://haswork.dev,http://localhost:5173

# Persistent store (Postgres)
TRANSFERS_DATABASE_URL=postgres://username:password@db-host:5432/bzr_transfers
TRANSFERS_DATA_SOURCE=store
TRANSFERS_STALE_THRESHOLD_SECONDS=900

# Ingester cadence
TRANSFERS_INGEST_INTERVAL_MS=30000
TRANSFERS_INGEST_CONCURRENCY=2
INGESTER_SUPERVISOR=systemd
```

---

**Next Step:** Run the deployment script or follow manual steps above to get your backend running! 🚀
