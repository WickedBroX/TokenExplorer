# Step 1 Deployment Checklist

## Pre-Deployment Verification ✅

- [x] Database migration file created (`001-create-token-info.sql`)
- [x] Refresh script created (`refresh-token-info.js`)
- [x] Server.js updated with new `/api/info` endpoint
- [x] Admin endpoint added (`POST /admin/refresh-token-info`)
- [x] Deployment script created (`deploy-step1.sh`)
- [x] Documentation complete (3 guides + architecture doc)
- [x] Syntax check passed (`node -c server.js` = no errors)
- [x] SQL validation passed (no syntax errors)

## Deployment Steps

### Step 1: Upload Files (5 minutes)
```bash
cd /Users/wickedbro/Desktop/TokenExplorer

# Option A: Automated (recommended)
./deploy-step1.sh

# Option B: Manual (if script fails)
# See STEP-1-QUICK-REFERENCE.md for commands
```

- [ ] Migration uploaded to `/var/www/bzr-backend/migrations/`
- [ ] Refresh script uploaded to `/var/www/bzr-backend/scripts/`
- [ ] Updated server.js uploaded to `/var/www/bzr-backend/`

### Step 2: Run Migration (2 minutes)
```bash
ssh root@159.198.70.88 "cd /var/www/bzr-backend && sudo -u postgres psql -d bzr_transfers -f migrations/001-create-token-info.sql"
```

- [ ] Migration executed without errors
- [ ] Table `token_info` created
- [ ] Indexes created

**Verify**:
```bash
ssh root@159.198.70.88 "sudo -u postgres psql -d bzr_transfers -c '\d token_info'"
```

Expected: Table structure with 14 columns

### Step 3: Initial Data Population (1 minute)
```bash
ssh root@159.198.70.88 "cd /var/www/bzr-backend && node scripts/refresh-token-info.js --force"
```

- [ ] Script executed successfully (exit code 0)
- [ ] Token info fetched from Etherscan
- [ ] Data inserted into database

**Verify**:
```bash
ssh root@159.198.70.88 "sudo -u postgres psql -d bzr_transfers -c 'SELECT token_name, token_symbol, updated_at FROM token_info;'"
```

Expected:
```
 token_name | token_symbol |         updated_at         
------------+--------------+----------------------------
 Bazaars    | BZR          | 2025-01-06 XX:XX:XX.XXXXXX
```

### Step 4: Restart Backend (1 minute)
```bash
ssh root@159.198.70.88 "systemctl restart bzr-backend.service"
```

- [ ] Service restarted successfully
- [ ] No errors in startup logs

**Verify**:
```bash
ssh root@159.198.70.88 "systemctl status bzr-backend.service"
```

Expected: `active (running)` status

### Step 5: Test API Endpoint (2 minutes)
```bash
# Test 1: Normal request (should use database)
curl http://159.198.70.88:3001/api/info | jq '.'
```

- [ ] Response received (200 OK)
- [ ] `tokenName`: "Bazaars"
- [ ] `tokenSymbol`: "BZR"
- [ ] `_source`: "database"
- [ ] Response time < 200ms

```bash
# Test 2: Force refresh (should fetch upstream)
curl "http://159.198.70.88:3001/api/info?force=true" | jq '._source'
```

- [ ] Response: "upstream"
- [ ] Database updated with new timestamp

```bash
# Test 3: Verify database was updated
ssh root@159.198.70.88 "sudo -u postgres psql -d bzr_transfers -c 'SELECT updated_at FROM token_info;'"
```

- [ ] Timestamp is current (within last minute)

### Step 6: Check Service Logs (1 minute)
```bash
ssh root@159.198.70.88 "journalctl -u bzr-backend.service -n 50 | grep '/api/info'"
```

- [ ] Log shows: "Returning token info from database"
- [ ] No errors or warnings
- [ ] Startup successful

### Step 7: Frontend Verification (2 minutes)

1. Open browser: http://159.198.70.88:3000 (or your frontend URL)
2. Navigate to "Info & Contract" tab
3. Wait for data to load

- [ ] Token info displays correctly
- [ ] No "temporarily unavailable" error
- [ ] Token name: "Bazaars"
- [ ] Token symbol: "BZR"
- [ ] Total supply: "55,555,555"
- [ ] Page loads in < 2 seconds

### Step 8: Set Up Automated Refresh (5 minutes)
```bash
ssh root@159.198.70.88

# Create log directory
mkdir -p /var/log/bzr

# Edit crontab
crontab -e
```

Add this line:
```
0 * * * * cd /var/www/bzr-backend && node scripts/refresh-token-info.js >> /var/log/bzr/refresh-token-info.log 2>&1
```

Save and exit.

- [ ] Crontab entry added
- [ ] Log directory created

**Verify**:
```bash
crontab -l | grep refresh-token-info
```

Expected: Should show the cron entry

### Step 9: Test Cron Job Manually (2 minutes)
```bash
# Run the cron command manually to verify it works
cd /var/www/bzr-backend && node scripts/refresh-token-info.js >> /var/log/bzr/refresh-token-info.log 2>&1

# Check log
cat /var/log/bzr/refresh-token-info.log
```

- [ ] Log shows successful execution
- [ ] OR shows "Token info already fresh, skipping refresh" (expected if < 1 hour)

### Step 10: Optional - Configure Admin Endpoint (3 minutes)
```bash
ssh root@159.198.70.88

# Edit service file
nano /etc/systemd/system/bzr-backend.service

# Add in [Service] section:
# Environment="ADMIN_PASSWORD=YourSecurePassword123"

# Save and reload
systemctl daemon-reload
systemctl restart bzr-backend.service
```

- [ ] Environment variable added
- [ ] Service restarted

**Test**:
```bash
curl -X POST http://159.198.70.88:3001/admin/refresh-token-info \
  -H "X-Admin-Password: YourSecurePassword123" \
  -H "Content-Type: application/json" | jq '.'
```

- [ ] Response: `{"success": true, ...}`
- [ ] Database updated

## Post-Deployment Monitoring

### First Hour
- [ ] Check logs every 15 minutes: `journalctl -u bzr-backend.service -f`
- [ ] Monitor API responses: Test `/api/info` multiple times
- [ ] Watch for errors in logs
- [ ] Verify `_source` is mostly "database"

### First 24 Hours
- [ ] Check cron execution: `cat /var/log/bzr/refresh-token-info.log`
- [ ] Verify hourly refresh is working
- [ ] Monitor response times
- [ ] Check for any user reports of issues
- [ ] Verify database `updated_at` is current

### Success Metrics (After 24 Hours)
- [ ] Zero "temporarily unavailable" errors
- [ ] Average response time < 100ms
- [ ] 95%+ requests served from database
- [ ] Cron job executed 24 times successfully
- [ ] No service restarts caused errors
- [ ] Database has latest token info

## Rollback Plan (If Issues Occur)

### Quick Rollback
```bash
ssh root@159.198.70.88
cd /var/www/bzr-backend

# Restore old server.js (if backed up)
cp server.js.backup server.js

# Restart service
systemctl restart bzr-backend.service
```

### Full Rollback (Nuclear Option)
```bash
# Remove cron job
crontab -e
# Delete the refresh line

# Drop table
sudo -u postgres psql -d bzr_transfers -c "DROP TABLE IF EXISTS token_info CASCADE;"

# Restore old server.js
# (from backup or git)

# Restart
systemctl restart bzr-backend.service
```

## Troubleshooting

### Issue: "Table does not exist"
```bash
# Check if table exists
ssh root@159.198.70.88 "sudo -u postgres psql -d bzr_transfers -c '\dt token_info'"

# If not, run migration again
ssh root@159.198.70.88 "cd /var/www/bzr-backend && sudo -u postgres psql -d bzr_transfers -f migrations/001-create-token-info.sql"
```

### Issue: API still returns "upstream"
```bash
# Check database has data
ssh root@159.198.70.88 "sudo -u postgres psql -d bzr_transfers -c 'SELECT updated_at FROM token_info;'"

# If empty, run refresh
ssh root@159.198.70.88 "cd /var/www/bzr-backend && node scripts/refresh-token-info.js --force"
```

### Issue: Service won't start
```bash
# Check logs
ssh root@159.198.70.88 "journalctl -u bzr-backend.service -n 100"

# Look for syntax errors or missing dependencies
# Common issues:
# - Missing axios (should already be installed)
# - Database connection error (check TRANSFERS_DATABASE_URL)
```

### Issue: Cron job not running
```bash
# Check cron daemon
ssh root@159.198.70.88 "systemctl status cron"

# Check crontab syntax
crontab -l

# Test manual execution
cd /var/www/bzr-backend && node scripts/refresh-token-info.js
```

## Sign-Off

### Deployment Team
- [ ] Developer: Implementation complete
- [ ] Reviewer: Code reviewed (self-review completed)
- [ ] Tester: Manual testing passed
- [ ] Deployer: Ready to execute deployment

### Deployment Window
- **Recommended**: Any time (no downtime expected)
- **Duration**: 15-20 minutes
- **Rollback Time**: < 2 minutes if needed
- **Risk Level**: Low

### Approval
- [ ] All pre-deployment checks passed
- [ ] Backup of current server.js exists
- [ ] Database credentials verified
- [ ] SSH access confirmed
- [ ] Monitoring tools ready

**Ready to Deploy**: ✅

---

**Start Time**: _____________  
**End Time**: _____________  
**Total Duration**: _____________  
**Deployed By**: _____________  
**Result**: ☐ Success  ☐ Failed  ☐ Rolled Back  

**Notes**:
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________
