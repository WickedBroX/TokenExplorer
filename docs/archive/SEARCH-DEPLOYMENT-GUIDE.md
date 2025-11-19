# Search Functionality - Deployment Guide

**Date**: November 11, 2025  
**Feature**: Enhanced Search (Address / Transaction / Block)

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:
- [x] Backend changes committed
- [x] Frontend changes committed  
- [x] Test script ready
- [ ] Database indexes verified
- [ ] Production environment variables checked
- [ ] Backup of current production code

---

## 🚀 Step 1: Deploy Backend

### 1.1 Connect to Production Server

```bash
ssh root@159.198.70.88
```

### 1.2 Navigate to Backend Directory

```bash
cd /root/bzr-backend
```

### 1.3 Backup Current Version

```bash
cp server.js server.js.backup-$(date +%Y%m%d-%H%M%S)
```

### 1.4 Pull Latest Changes

```bash
# If using git
git pull origin main

# Or manually copy the updated server.js
# The search functionality is in server.js lines 3473-3766
```

### 1.5 Verify Database Indexes

```bash
# Connect to PostgreSQL
sudo -u postgres psql bzr_transfers

# Check indexes on transfer_events table
\d transfer_events

# Should see indexes on:
# - tx_hash
# - from_address
# - to_address  
# - block_number
# - chain_id

# If missing, create them:
CREATE INDEX IF NOT EXISTS idx_transfer_events_tx_hash ON transfer_events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transfer_events_from_address ON transfer_events(from_address);
CREATE INDEX IF NOT EXISTS idx_transfer_events_to_address ON transfer_events(to_address);
CREATE INDEX IF NOT EXISTS idx_transfer_events_block_number ON transfer_events(block_number);

# Exit psql
\q
```

### 1.6 Restart Backend Service

```bash
# Using PM2
pm2 restart bzr-backend

# Check status
pm2 status

# View logs
pm2 logs bzr-backend --lines 50
```

### 1.7 Test Backend Endpoint

```bash
# Test the search endpoint
curl "http://localhost:3001/api/search?query=0x85Cb098bdcD3Ca929d2cD18Fc7A2669fF0362242"

# Expected output (JSON):
# {
#   "success": true,
#   "searchType": "address",
#   "query": "0x85Cb...",
#   "source": "database",
#   "found": true,
#   "data": { ... }
# }
```

---

## 🎨 Step 2: Deploy Frontend

### 2.1 On Your Local Machine

```bash
cd /Users/wickedbro/Desktop/TokenExplorer/bzr-frontend
```

### 2.2 Verify Environment Variables

```bash
# Check .env file
cat .env

# Should contain:
# VITE_API_URL=http://159.198.70.88:3001
```

### 2.3 Build Frontend

```bash
npm run build

# This creates the dist/ directory with optimized production build
```

### 2.4 Test Build Locally (Optional)

```bash
npm run preview

# Visit http://localhost:4173 to test the build
```

### 2.5 Deploy to Production

#### Option A: Using SCP

```bash
# Backup current frontend on server first
ssh root@159.198.70.88 "cd /var/www && tar -czf bzr-frontend-backup-$(date +%Y%m%d-%H%M%S).tar.gz bzr-frontend/"

# Upload new build
scp -r dist/* root@159.198.70.88:/var/www/bzr-frontend/
```

#### Option B: Using rsync (Recommended)

```bash
# Faster and smarter - only uploads changed files
rsync -avz --delete dist/ root@159.198.70.88:/var/www/bzr-frontend/
```

#### Option C: Manual Upload via SSH

```bash
ssh root@159.198.70.88

cd /var/www/bzr-frontend

# Backup first
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz *

# Clear directory (keep backup)
rm -rf !(backup-*)

# Then SCP files from local machine in another terminal
```

---

## 🧪 Step 3: Testing

### 3.1 Test Backend from Production Server

```bash
# SSH into server
ssh root@159.198.70.88

# Run comprehensive tests
bash < <(curl -s https://raw.githubusercontent.com/YOUR_REPO/test-search.sh)

# Or manually test each endpoint:

# Test 1: Address Search
curl "http://localhost:3001/api/search?query=0x85Cb098bdcD3Ca929d2cD18Fc7A2669fF0362242"

# Test 2: Block Search
curl "http://localhost:3001/api/search?query=18000000"

# Test 3: Invalid Input
curl "http://localhost:3001/api/search?query=invalid"

# Test 4: Empty Query
curl "http://localhost:3001/api/search?query="
```

### 3.2 Test Frontend from Browser

Visit: `http://159.198.70.88`

**Test Cases**:

1. **Address Search**:
   - Enter: `0x85Cb098bdcD3Ca929d2cD18Fc7A2669fF0362242`
   - Press Enter
   - ✅ Should switch to Transfers tab
   - ✅ Should filter to show only BZR contract transfers

2. **Transaction Hash** (Find a real tx from your DB):
   ```sql
   # SSH to server and get a real tx hash
   sudo -u postgres psql bzr_transfers
   SELECT tx_hash FROM transfer_events LIMIT 1;
   ```
   - Enter the tx hash
   - Press Enter
   - ✅ Should open modal with transaction details
   - ✅ Should show "View on Explorer" button
   - ✅ Should show "Show All Transfers" buttons

3. **Block Number**:
   - Enter: `18000000`
   - Press Enter
   - ✅ Should switch to Transfers tab
   - ✅ Should filter to that block (if transfers exist)

4. **Invalid Input**:
   - Enter: `hello world`
   - Press Enter
   - ✅ Should show red error message

5. **Empty Input**:
   - Click search without typing
   - Press Enter
   - ✅ Should show "Please enter a search query"

6. **Loading State**:
   - Enter valid address
   - Press Enter
   - ✅ Should show spinner while searching

---

## 🔍 Step 4: Monitoring

### 4.1 Backend Logs

```bash
# Real-time logs
pm2 logs bzr-backend --lines 100

# Search for search-related logs
pm2 logs bzr-backend | grep -i "search"

# Check for errors
pm2 logs bzr-backend --err
```

### 4.2 Monitor API Performance

```bash
# Watch API response times
watch -n 5 'curl -w "\nTime: %{time_total}s\n" -o /dev/null -s "http://localhost:3001/api/search?query=0x85Cb098bdcD3Ca929d2cD18Fc7A2669fF0362242"'
```

### 4.3 Database Performance

```bash
# Check query performance
sudo -u postgres psql bzr_transfers

# Enable query timing
\timing on

# Test search queries
SELECT * FROM transfer_events WHERE tx_hash = '0x...' LIMIT 1;
SELECT COUNT(*) FROM transfer_events WHERE from_address = '0x...' OR to_address = '0x...';
SELECT COUNT(*) FROM transfer_events WHERE block_number = 18000000;

# Check index usage
EXPLAIN ANALYZE SELECT * FROM transfer_events WHERE tx_hash = '0x...' LIMIT 1;
```

---

## 🚨 Troubleshooting

### Issue: "Search endpoint returns 404"

**Solution**:
```bash
# Check if backend is running
pm2 status

# Check server.js has the new code
grep -n "api/search" /root/bzr-backend/server.js

# Restart backend
pm2 restart bzr-backend
```

### Issue: "CORS error in browser console"

**Solution**:
```bash
# Check ALLOWED_ORIGINS in .env
cat /root/bzr-backend/.env | grep ALLOWED_ORIGINS

# Should include your frontend URL
# ALLOWED_ORIGINS=http://159.198.70.88,*

# Update and restart if needed
pm2 restart bzr-backend
```

### Issue: "Modal doesn't open for transaction search"

**Solution**:
- Check browser console for errors
- Verify frontend build includes new files:
  - `TransactionDetailsModal.tsx`
  - `searchUtils.ts`
- Clear browser cache: Ctrl+Shift+R

### Issue: "Database query slow"

**Solution**:
```bash
# Verify indexes exist
sudo -u postgres psql bzr_transfers -c "\d transfer_events"

# Create missing indexes
sudo -u postgres psql bzr_transfers << EOF
CREATE INDEX IF NOT EXISTS idx_transfer_events_tx_hash ON transfer_events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transfer_events_from_address ON transfer_events(from_address);
CREATE INDEX IF NOT EXISTS idx_transfer_events_to_address ON transfer_events(to_address);
CREATE INDEX IF NOT EXISTS idx_transfer_events_block_number ON transfer_events(block_number);
VACUUM ANALYZE transfer_events;
EOF
```

---

## 📊 Post-Deployment Validation

### Backend Health Check

```bash
# SSH into server
ssh root@159.198.70.88

# Check service status
pm2 status

# Should show:
# ┌─────┬────────────────┬─────────┬─────────┬─────────┐
# │ id  │ name           │ status  │ ↺       │ cpu     │
# ├─────┼────────────────┼─────────┼─────────┼─────────┤
# │ 0   │ bzr-backend    │ online  │ 0       │ 0%      │
# └─────┴────────────────┴─────────┴─────────┴─────────┘

# Test all search types
curl "http://localhost:3001/api/search?query=0x85Cb098bdcD3Ca929d2cD18Fc7A2669fF0362242" | jq '.success'
# Should output: true

# Check logs for errors
pm2 logs bzr-backend --lines 50 --err
# Should be empty or no recent errors
```

### Frontend Validation

Visit: http://159.198.70.88

**Visual Checks**:
- [x] Search bar visible in header
- [x] Search bar accepts input
- [x] Placeholder text correct
- [x] Responsive on mobile
- [x] No console errors

**Functional Checks**:
- [x] Address search works
- [x] Transaction modal opens
- [x] Block search works
- [x] Error messages display
- [x] Loading spinner shows

---

## 🎉 Success Criteria

Deployment is successful if:

✅ Backend `/api/search` endpoint responds  
✅ All search types work (address/transaction/block)  
✅ Frontend search bar is functional  
✅ Transaction modal displays correctly  
✅ No errors in logs  
✅ Response times < 2 seconds  
✅ Mobile search works  
✅ Error handling works  

---

## 📝 Rollback Plan

If something goes wrong:

### Rollback Backend

```bash
ssh root@159.198.70.88
cd /root/bzr-backend

# Find backup
ls -lh server.js.backup-*

# Restore latest backup
cp server.js.backup-YYYYMMDD-HHMMSS server.js

# Restart
pm2 restart bzr-backend
```

### Rollback Frontend

```bash
ssh root@159.198.70.88
cd /var/www/bzr-frontend

# Find backup
ls -lh ../backup-*.tar.gz

# Restore
tar -xzf ../backup-YYYYMMDD-HHMMSS.tar.gz

# Clear browser cache
```

---

## 📞 Support

If you need help:
1. Check logs: `pm2 logs bzr-backend`
2. Check database: `sudo -u postgres psql bzr_transfers`
3. Check browser console for frontend errors
4. Review implementation docs: `SEARCH-IMPLEMENTATION-COMPLETE.md`

---

**Ready to deploy!** 🚀  
Follow the steps above in order for a smooth deployment.
