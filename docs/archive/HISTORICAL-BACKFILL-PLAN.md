# 📚 Historical Backfill Implementation Plan

## Overview

Client wants to see **complete historical data** matching PolygonScan. Current system only has **785 transfers** (recent data from continuous ingester), but actual history shows **50,000+ transfers** across all chains.

**Solution**: One-time historical backfill using Etherscan API V2 PRO endpoints.

---

## Current State Analysis

### Data Gap
- **Current**: 785 Polygon transfers, 4,134 holders
- **Actual**: ~50,000+ transfers, likely more holders
- **Problem**: Ingester starts from "now" and goes forward, missing all historical data

### Database Schema
```
transfer_events (
  chain_id INTEGER,
  block_number BIGINT,
  tx_hash TEXT,
  log_index INTEGER,
  time_stamp TIMESTAMP WITH TIME ZONE,
  from_address TEXT,
  to_address TEXT,
  value TEXT,
  method_id TEXT,
  payload JSONB,
  inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (chain_id, tx_hash, log_index)
)
```

### Current Ingester Cursors
```
Chain ID | Chain       | Current Cursor | Last Updated
---------|-------------|----------------|-------------
1        | Ethereum    | 23,716,465     | 2025-11-06
10       | Optimism    | 143,116,979    | 2025-11-06
56       | BSC         | 65,489,661     | 2025-11-06
137      | Polygon     | 78,634,137     | 2025-11-06
324      | zkSync Era  | 65,393,525     | 2025-11-06
5000     | Mantle      | 83,229,359     | 2025-11-06
8453     | Base        | 37,159,801     | 2025-11-06
42161    | Arbitrum    | 392,110,640    | 2025-11-06
43114    | Avalanche   | 70,713,230     | 2025-11-06
```

### API Resources
- **Provider**: Etherscan API V2 (replaces deprecated PolygonScan API)
- **Plan**: PRO (3 API keys for load balancing)
- **Keys**: 
  - `I9JQANQB94N685X8EAAM1PDZ35RFXWHTXN`
  - `CTC8P9QQ7D1URESC65MHMDN524WMACMTDT`
  - `QHFCHIS2DGPF48W8NIBNRG4PXMCMU9ZJ35`
- **Limits**: 100,000 calls/day, 5 req/sec, **10,000 records per request**
- **Current Ingester**: Uses 100 records per request (regular limit)

---

## Backfill Strategy

### Approach: One-Time Historical Backfill

**Goal**: Fetch ALL transfers from block 0 to current ingester cursor position

**Benefits**:
- ✅ Complete historical data matching PolygonScan
- ✅ Uses existing database schema (no changes needed)
- ✅ Utilizes PRO plan efficiently (10K records per request vs 100)
- ✅ Resumes from failures (progress tracking)
- ✅ No duplicate data (ON CONFLICT DO NOTHING)
- ✅ Doesn't interfere with continuous ingester

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Historical Timeline                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Block 0                      Current Cursor    Latest Block │
│    │                               │                  │      │
│    ├───────────────────────────────┤                  │      │
│    │   BACKFILL THIS RANGE        │  INGESTER RANGE  │      │
│    │   (One-time historical)       │  (Continuous)    │      │
│    │                               │                  │      │
│    └───────────────────────────────┘                  │      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Load Balancing**: Round-robin through 3 API keys
2. **Progress Tracking**: New table `transfer_backfill_progress` stores last processed block
3. **Resume Support**: Can restart from last checkpoint if interrupted
4. **Batch Inserts**: 1,000 records per database transaction
5. **Rate Limiting**: 250ms between requests (4 req/sec, safe for 5/sec limit)
6. **Conflict Handling**: `ON CONFLICT DO NOTHING` prevents duplicates

---

## Implementation

### 1. Backfill Script

**Location**: `bzr-backend/scripts/backfill-historical.js`

**Features**:
- ✅ Fetches from block 0 to ingester cursor
- ✅ Uses PRO endpoint with 10K page size
- ✅ Load balances across 3 API keys
- ✅ Tracks progress per chain
- ✅ Batch inserts with conflict resolution
- ✅ Rate limiting and error handling

**Usage**:
```bash
# Backfill specific chain
node scripts/backfill-historical.js 137

# Backfill all chains
node scripts/backfill-historical.js all
```

### 2. Progress Tracking Table

```sql
CREATE TABLE IF NOT EXISTS transfer_backfill_progress (
  chain_id INTEGER PRIMARY KEY,
  last_backfilled_block BIGINT NOT NULL,
  total_fetched INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

**Purpose**:
- Stores last successfully backfilled block per chain
- Allows resuming from failures
- Tracks total records fetched for reporting

### 3. Database Insert Strategy

**Approach**: Batch inserts with conflict resolution

```sql
INSERT INTO transfer_events 
(chain_id, block_number, tx_hash, log_index, time_stamp, 
 from_address, to_address, value, method_id, payload)
VALUES (...)
ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING
```

**Benefits**:
- No duplicates if overlapping with ingester
- Safe to re-run if script crashes
- Fast batch processing (1,000 records per transaction)

---

## Execution Plan

### Phase 1: Test on Polygon (Largest Dataset)

**Polygon is the best test case** because it has the most transfers (~50K+)

```bash
# Connect to server
ssh root@159.198.70.88

# Navigate to backend
cd /root/bzr-backend

# Run backfill for Polygon only
node scripts/backfill-historical.js 137
```

**Expected Results**:
- Fetches ~50,000+ transfers
- Takes ~10-15 minutes
- Inserts into database with no duplicates
- Progress tracked in `transfer_backfill_progress`

### Phase 2: Verify Data

```bash
# Check total transfers for Polygon
sudo -u postgres psql bzr_transfers -c \
  "SELECT COUNT(*) FROM transfer_events WHERE chain_id = 137"

# Check date range
sudo -u postgres psql bzr_transfers -c \
  "SELECT MIN(time_stamp), MAX(time_stamp) 
   FROM transfer_events WHERE chain_id = 137"

# Check backfill progress
sudo -u postgres psql bzr_transfers -c \
  "SELECT * FROM transfer_backfill_progress WHERE chain_id = 137"
```

**Success Criteria**:
- Transfer count matches PolygonScan (~50K+)
- Date range starts from token deployment
- No gaps in block numbers

### Phase 3: Backfill All Chains

```bash
# Run full backfill (all 9 chains - excluding Cronos)
node scripts/backfill-historical.js all
```

**Estimated Time**: 30-60 minutes total for all chains

**Load Balancing**: Script automatically rotates through 3 API keys

### Phase 4: Verify Frontend

**Test Cases**:
1. **Total Transfers**: Should show ~50K+ instead of 785
2. **Oldest Transfer**: Should match token deployment date
3. **Analytics**: Historical charts should show complete data
4. **Pagination**: Test with 50K+ records

---

## Time & Resource Estimates

### Polygon Chain Example (Largest Dataset)

**Assumptions**:
- 50,000 total transfers
- 10,000 records per API request
- 250ms delay between requests

**Calculations**:
```
Requests needed: 50,000 / 10,000 = 5 requests
Time per request: 250ms delay + 500ms API = 750ms average
Total time: 5 × 750ms = 3.75 seconds (API calls)
Database inserts: 50,000 / 1,000 = 50 batches × 100ms = 5 seconds
Total: ~10 seconds
```

**Actual time will be higher** due to:
- Pagination through block ranges
- Network latency
- Database indexing
- Error retries

**Realistic estimate**: 10-15 minutes per major chain

### All Chains Combined

**Conservative estimate**: 30-60 minutes for complete backfill

**API Usage**:
- ~100 API calls total (with PRO 10K page size)
- Well under 100K/day limit
- Load balanced across 3 keys = ~33 calls per key

---

## Safety Measures

### 1. No Interference with Ingester

**Backfill Range**: Block 0 to (cursor - 1)  
**Ingester Range**: Cursor to latest block

**No overlap** = No conflicts

### 2. Duplicate Prevention

```sql
ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING
```

**Safe to re-run** if script crashes

### 3. Progress Tracking

```
transfer_backfill_progress table stores:
- Last successfully processed block
- Total records fetched
- Last update timestamp
```

**Can resume** from any point

### 4. Rate Limiting

- 250ms delay between requests
- 4 requests/second (under 5/sec PRO limit)
- 3 API keys for load distribution

### 5. Error Handling

- HTTP 429 (rate limit): Auto-retry after 2 seconds
- Network errors: Logged and thrown (manual intervention)
- Database errors: Transaction rollback, no partial data

---

## Post-Backfill Tasks

### 1. Update Frontend Pagination

**Current**: May have issues with 50K+ records

**Solution**: Implement proper server-side pagination
- `/api/transfers?page=1&limit=100&chainId=137`
- Frontend loads pages dynamically
- Add "Load More" or infinite scroll

### 2. Refresh Analytics Aggregates

Some analytics tables might need refresh:
```sql
-- Example: Refresh daily aggregates
SELECT refresh_transfer_daily_aggregates();
```

### 3. Update Total Counts

Verify all count endpoints reflect new data:
- Total transfers per chain
- Total holders
- Daily/weekly/monthly stats

### 4. Test Performance

With 50K+ records:
- API response times
- Database query performance
- Frontend rendering

**May need**:
- Additional database indexes
- Query optimization
- Frontend pagination

---

## Monitoring & Verification

### During Backfill

**Watch for**:
```bash
# Monitor script output
node scripts/backfill-historical.js all

# In separate terminal, monitor database
watch -n 5 'sudo -u postgres psql bzr_transfers -c "SELECT chain_id, COUNT(*) FROM transfer_events GROUP BY chain_id ORDER BY chain_id"'
```

### After Completion

**Verification Queries**:
```sql
-- Total transfers per chain
SELECT chain_id, COUNT(*) as total
FROM transfer_events
GROUP BY chain_id
ORDER BY chain_id;

-- Date range per chain
SELECT 
  chain_id,
  MIN(time_stamp) as earliest,
  MAX(time_stamp) as latest
FROM transfer_events
GROUP BY chain_id
ORDER BY chain_id;

-- Backfill progress summary
SELECT * FROM transfer_backfill_progress
ORDER BY chain_id;

-- Total unique holders (Polygon)
SELECT COUNT(DISTINCT from_address) + COUNT(DISTINCT to_address) as unique_addresses
FROM transfer_events
WHERE chain_id = 137;
```

**Compare with PolygonScan**:
- Visit: https://polygonscan.com/token/0x85Cb098bdcD3Ca929d2cD18Fc7A2669fF0362242
- Compare total transfers
- Check earliest transfer date
- Verify holder count

---

## Rollback Plan

**If something goes wrong**:

### Option 1: Delete and Re-run
```sql
-- Delete all transfers for a specific chain
DELETE FROM transfer_events WHERE chain_id = 137;

-- Delete backfill progress
DELETE FROM transfer_backfill_progress WHERE chain_id = 137;

-- Re-run backfill
node scripts/backfill-historical.js 137
```

### Option 2: Resume from Checkpoint
```sql
-- Reset to earlier block
UPDATE transfer_backfill_progress 
SET last_backfilled_block = 10000000
WHERE chain_id = 137;

-- Re-run (will resume from block 10000001)
node scripts/backfill-historical.js 137
```

### Option 3: Full Database Restore
```bash
# Restore from backup
sudo -u postgres pg_restore -d bzr_transfers /path/to/backup.sql
```

---

## Next Steps

### Immediate Actions

1. ✅ **Created**: `scripts/backfill-historical.js` - Complete backfill tool
2. ⏳ **Upload**: Transfer script to production server
3. ⏳ **Test**: Run Polygon backfill (chain 137)
4. ⏳ **Verify**: Compare with PolygonScan data
5. ⏳ **Execute**: Run full backfill for all chains
6. ⏳ **Monitor**: Watch progress and handle any errors
7. ⏳ **Validate**: Test frontend with complete data

### Follow-up Improvements

1. **Frontend Pagination**: Update to handle 50K+ records
2. **Analytics Refresh**: Recalculate aggregates with full data
3. **Performance Testing**: Ensure queries remain fast
4. **Documentation**: Update API docs with new data ranges

---

## Technical Notes

### Why Not Modify Ingester?

**Considered**: Making ingester fetch historical data

**Problems**:
- Ingester designed for continuous forward-only sync
- Would need major architectural changes
- Risk breaking current functionality
- Backfill is one-time, ingester is continuous

**Better**: Separate backfill script, one-time execution

### Cronos Chain (ID: 25)

**Status**: Not included in initial backfill

**Reason**: Uses different API (Cronos explorer, not Etherscan V2)

**Future**: Implement separate Cronos backfill if needed

### API Key Rotation

**Implementation**:
```javascript
let currentKeyIndex = 0;

function getNextApiKey() {
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return key;
}
```

**Result**: Each API key gets ~33% of requests, staying well under limits

---

## Success Metrics

### Quantitative

- ✅ Total transfers: 785 → 50,000+ (6400% increase)
- ✅ Date coverage: Last few days → Full history since deployment
- ✅ Holder count: 4,134 → Complete accurate count
- ✅ API efficiency: 100 records/req → 10,000 records/req (10000% efficiency)

### Qualitative

- ✅ Client sees complete historical data matching PolygonScan
- ✅ Analytics show accurate trends over full timeline
- ✅ No data gaps or inconsistencies
- ✅ System handles large dataset efficiently

---

## Questions & Answers

### Q: Will this affect the running ingester?

**A**: No. Backfill fetches blocks 0 to (cursor - 1). Ingester works from cursor forward. No overlap.

### Q: What if the script crashes halfway?

**A**: Progress is saved after each batch. Re-running resumes from last checkpoint.

### Q: Will there be duplicate data?

**A**: No. Database constraint + `ON CONFLICT DO NOTHING` prevents duplicates.

### Q: How long will it take?

**A**: ~30-60 minutes for all chains. Polygon alone: ~10-15 minutes.

### Q: Can we run backfill multiple times?

**A**: Yes, completely safe. Duplicate prevention ensures data integrity.

### Q: What about API rate limits?

**A**: Script uses 4 req/sec (under 5/sec limit) with 3 keys for distribution. Total: 100K/day limit, we'll use <1000 calls.

---

## Ready to Execute

**Script created**: `bzr-backend/scripts/backfill-historical.js`

**Next command**:
```bash
# Upload to server
scp scripts/backfill-historical.js root@159.198.70.88:/root/bzr-backend/scripts/

# SSH to server
ssh root@159.198.70.88

# Test on Polygon
cd /root/bzr-backend
node scripts/backfill-historical.js 137
```

---

*Document created: November 6, 2025*  
*Status: Ready for execution*  
*Risk: Low (non-destructive, resumable, duplicate-safe)*
