# Step 1 Deployment Guide: Token Info Database Persistence

## Overview
This guide walks through deploying the database-backed token info caching system.

## What's Being Deployed
1. **Database Migration**: Creates `token_info` table for persistent storage
2. **Refresh Script**: Background job to fetch and persist token metadata
3. **Updated Server**: Modified `/api/info` endpoint to prefer database

## Benefits
- ✅ Eliminates "temporarily unavailable" errors
- ✅ Faster response times (DB query vs 3 API calls)
- ✅ Survives service restarts
- ✅ Graceful degradation when upstream fails
- ✅ Monitoring and debugging capabilities

## Prerequisites
- SSH access to 159.198.70.88
- PostgreSQL access (bzr_transfers database)
- Node.js environment on server

## Deployment Steps

### Option 1: Automated Deployment (Recommended)
```bash
cd /Users/wickedbro/Desktop/TokenExplorer
./deploy-step1.sh
```

You'll be prompted for SSH password multiple times. The script will:
1. Create necessary directories
2. Upload migration, refresh script, and updated server.js
3. Run database migration
4. Populate initial data
5. Restart backend service
6. Verify deployment

### Option 2: Manual Deployment

#### Step 1: Upload Files
```bash
# From your local machine
cd /Users/wickedbro/Desktop/TokenExplorer

# Create directories on server
ssh root@159.198.70.88 "mkdir -p /var/www/bzr-backend/migrations /var/www/bzr-backend/scripts"

# Upload migration
scp bzr-backend/migrations/001-create-token-info.sql root@159.198.70.88:/var/www/bzr-backend/migrations/

# Upload refresh script
scp bzr-backend/scripts/refresh-token-info.js root@159.198.70.88:/var/www/bzr-backend/scripts/

# Upload updated server
scp bzr-backend/server.js root@159.198.70.88:/var/www/bzr-backend/
```

#### Step 2: Run Database Migration
```bash
# SSH into server
ssh root@159.198.70.88

# Run migration
cd /var/www/bzr-backend
sudo -u postgres psql -d bzr_transfers -f migrations/001-create-token-info.sql

# Verify table created
sudo -u postgres psql -d bzr_transfers -c "\d token_info"
```

Expected output:
```
Table "public.token_info"
Column                    | Type              | Nullable
--------------------------+-------------------+----------
contract_address          | character varying | not null
chain_id                  | integer           | not null
token_name                | character varying |
token_symbol              | character varying |
...
```

#### Step 3: Initial Data Population
```bash
# Still on server
cd /var/www/bzr-backend

# Run refresh script with force flag
node scripts/refresh-token-info.js --force
```

Expected output:
```
🔄 Fetching token info from Etherscan API...
✅ Token info updated successfully
   Contract: 0x85cb098bdcd3ca929d2cd18fc7a2669ff0362242
   Token: Bazaars (BZR)
   Supply: 55555555
```

#### Step 4: Restart Backend Service
```bash
# Restart service to load updated code
systemctl restart bzr-backend.service

# Check status
systemctl status bzr-backend.service

# Watch logs
journalctl -u bzr-backend.service -f
```

Look for these log messages:
```
[timestamp] Received request for /api/info
-> Returning token info from database (updated 2025-01-06T...)
```

#### Step 5: Verify Deployment
```bash
# Test 1: Check API response
curl http://159.198.70.88:3001/api/info | jq '.'

# Should show:
# {
#   "tokenName": "Bazaars",
#   "tokenSymbol": "BZR",
#   "_source": "database",
#   ...
# }

# Test 2: Check database
sudo -u postgres psql -d bzr_transfers -c "SELECT contract_address, token_name, token_symbol, updated_at FROM token_info;"

# Test 3: Test force refresh
curl "http://159.198.70.88:3001/api/info?force=true" | jq '._source'
# Should return "upstream"

# Test 4: Normal request (should use DB)
curl "http://159.198.70.88:3001/api/info" | jq '._source'
# Should return "database"
```

## Post-Deployment: Set Up Automated Refresh

### Option A: Cron Job (Recommended)
```bash
# SSH into server
ssh root@159.198.70.88

# Create log directory
mkdir -p /var/log/bzr

# Edit crontab
crontab -e

# Add this line (runs every hour at minute 0)
0 * * * * cd /var/www/bzr-backend && node scripts/refresh-token-info.js >> /var/log/bzr/refresh-token-info.log 2>&1

# Save and exit
# Verify crontab
crontab -l
```

### Option B: Systemd Timer
```bash
# Create timer unit
cat > /etc/systemd/system/bzr-refresh-token-info.timer << 'EOF'
[Unit]
Description=Refresh BZR Token Info Hourly

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Create service unit
cat > /etc/systemd/system/bzr-refresh-token-info.service << 'EOF'
[Unit]
Description=Refresh BZR Token Info

[Service]
Type=oneshot
WorkingDirectory=/var/www/bzr-backend
ExecStart=/usr/bin/node scripts/refresh-token-info.js
StandardOutput=journal
StandardError=journal
EOF

# Enable and start timer
systemctl daemon-reload
systemctl enable bzr-refresh-token-info.timer
systemctl start bzr-refresh-token-info.timer

# Check timer status
systemctl list-timers bzr-refresh-token-info.timer
```

## Configure Admin Endpoint (Optional)

The admin endpoint allows manual refresh via API:

```bash
# SSH into server
ssh root@159.198.70.88

# Edit service file
nano /etc/systemd/system/bzr-backend.service

# Add environment variable (in [Service] section)
Environment="ADMIN_PASSWORD=your-secure-password-here"

# Reload and restart
systemctl daemon-reload
systemctl restart bzr-backend.service
```

Test admin endpoint:
```bash
curl -X POST http://159.198.70.88:3001/admin/refresh-token-info \
  -H "X-Admin-Password: your-secure-password-here" \
  -H "Content-Type: application/json" | jq '.'
```

## Monitoring

### Check Refresh Logs
```bash
# Cron job logs
tail -f /var/log/bzr/refresh-token-info.log

# Systemd timer logs
journalctl -u bzr-refresh-token-info.service -f

# Backend service logs
journalctl -u bzr-backend.service -f | grep "token info"
```

### Database Monitoring
```bash
# Check last update time
sudo -u postgres psql -d bzr_transfers -c "
  SELECT 
    token_name,
    token_symbol,
    updated_at,
    last_fetch_success,
    last_fetch_error
  FROM token_info;
"

# Check how often DB is being used
# Look for "_source": "database" in API responses
curl http://159.198.70.88:3001/api/info | jq '._source'
```

## Troubleshooting

### Issue: "Table does not exist"
```bash
# Verify migration ran
sudo -u postgres psql -d bzr_transfers -c "\dt token_info"

# If not found, run migration manually
cd /var/www/bzr-backend
sudo -u postgres psql -d bzr_transfers -f migrations/001-create-token-info.sql
```

### Issue: "No token info in database"
```bash
# Run refresh script manually
cd /var/www/bzr-backend
node scripts/refresh-token-info.js --force

# Check for errors
echo $?  # Should be 0
```

### Issue: API still shows "_source": "upstream"
```bash
# Check database has recent data
sudo -u postgres psql -d bzr_transfers -c "SELECT updated_at FROM token_info;"

# If older than 1 hour, refresh
node scripts/refresh-token-info.js --force

# If data is fresh but still showing upstream, check logs
journalctl -u bzr-backend.service -n 50 | grep "/api/info"
```

### Issue: Upstream API errors
This is expected behavior - the system will fallback to database:
```bash
# Check logs for fallback messages
journalctl -u bzr-backend.service -f

# Look for:
# "-> Upstream failed, returning stale DB data from..."
# Or: "-> Emergency fallback: returning DB data from..."
```

## Rollback Plan

If issues occur:

```bash
# SSH into server
ssh root@159.198.70.88

# Restore old server.js (if you backed it up)
cd /var/www/bzr-backend
cp server.js.backup server.js

# OR download from backup
scp root@159.198.70.88:/var/www/bzr-backend/backup/bzr-backend-YYYY-MM-DD/server.js /tmp/
scp /tmp/server.js root@159.198.70.88:/var/www/bzr-backend/

# Restart service
systemctl restart bzr-backend.service

# Optionally drop the table (if causing issues)
sudo -u postgres psql -d bzr_transfers -c "DROP TABLE IF EXISTS token_info CASCADE;"
```

## Success Criteria

✅ Migration ran without errors  
✅ `token_info` table exists with data  
✅ `/api/info` returns `"_source": "database"` for normal requests  
✅ Service restart doesn't cause "temporarily unavailable" errors  
✅ Refresh script runs successfully (manually or via cron)  
✅ Backend logs show "Returning token info from database"  
✅ API response time improved (< 100ms vs 500-1000ms)  

## Next Steps (After Step 1)

Once Step 1 is stable, consider implementing:
- **Step 2**: Make `/api/stats` read from `transfer_chain_totals` (DB) instead of live aggregation
- **Step 3**: Add Redis for ultra-fast caching (price, market data)
- **Step 4**: Frontend improvements (instant localStorage display, background refresh)
- **Step 5**: Monitoring dashboard (cache hit ratios, upstream health)

## Support

If you encounter issues:
1. Check logs: `journalctl -u bzr-backend.service -f`
2. Verify database: `sudo -u postgres psql -d bzr_transfers -c "SELECT * FROM token_info;"`
3. Test refresh script: `cd /var/www/bzr-backend && node scripts/refresh-token-info.js --force`
4. Check API: `curl http://159.198.70.88:3001/api/info | jq '.'`
