# Transaction Hash & Block Hash Search Fix

## Date: November 11, 2025

## Problem
User reported that Transaction Hash and Block Hash searches were not working, while Block Number, From Address, and To Address searches worked correctly.

## Root Causes

### 1. Transaction Hash Search Issue
- Transaction hash searches were working on the backend
- Frontend was showing the transaction details modal
- **Missing**: Frontend wasn't switching to the transfers tab to show the filtered results
- Users couldn't see the transaction in the table even though search was successful

### 2. Block Hash Search Issue
- Block hash searches were **not supported at all**
- Block hashes have the same format as transaction hashes (0x + 64 hex characters)
- The backend `detectSearchType()` function categorized both as 'transaction'
- No backend logic existed to search by block hash
- No frontend filtering logic for block hash

## Solutions Implemented

### Backend Changes (`bzr-backend/server.js`)

#### 1. New `searchByBlockHash()` Function
Added a new function to search transfers by block hash:
```javascript
const searchByBlockHash = async (blockHash) => {
  // Searches transfer_events table WHERE block_hash = $1
  // Returns block info: blockHash, blockNumber, timestamp, transferCount, chain
}
```

#### 2. Enhanced Transaction Search Logic
Modified the search endpoint to try BOTH transaction hash and block hash when a 64-character hex string is detected:
```javascript
case 'transaction':
  result = await searchByTransaction(query);
  
  // If not found as transaction, try as block hash
  if (!result.found) {
    const blockResult = await searchByBlockHash(query);
    if (blockResult.found) {
      result = blockResult;
    }
  }
  break;
```

### Frontend Changes (`bzr-frontend/src/App.tsx`)

#### 1. Added Block Hash Filter State
```typescript
const [filterBlockHash, setFilterBlockHash] = useState('');
```

#### 2. Enhanced Search Handler
- Transaction searches now switch to transfers tab (was missing before)
- Detects if search result is actually a block hash
- Sets appropriate filter based on result type

```typescript
} else if (result.searchType === 'transaction' && result.found) {
  // Check if the result is actually a block (backend tries both)
  if (result.type === 'block' && result.data?.blockHash) {
    // It's actually a block hash
    setFilterBlockHash(String(result.data.blockHash));
  } else {
    // It's a transaction hash
    setFilterTxHash(query.trim());
  }
  if (activeTab !== 'transfers') {
    setActiveTab('transfers'); // NOW SWITCHES TO TRANSFERS TAB
  }
  // ... scroll logic
}
```

#### 3. Added Block Hash Filtering Logic
```typescript
// Filter by block hash
if (filterBlockHash) {
  const hashLower = filterBlockHash.toLowerCase().trim();
  filtered = filtered.filter(tx => 
    tx.blockHash && tx.blockHash.toLowerCase() === hashLower
  );
}
```

#### 4. Added Block Hash Filter Badge
Added cyan-colored badge to show active block hash filter:
```tsx
{filterBlockHash && (
  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-cyan-700">
    Block Hash: {truncateHash(filterBlockHash, 6, 4)}
  </span>
)}
```

#### 5. Updated Clear Filters Button
Added `setFilterBlockHash('')` to the clear all filters handler.

## Filter Badge Colors
- **Purple**: Address filter (From/To)
- **Green**: Block number filter
- **Orange**: Transaction hash filter
- **Cyan**: Block hash filter (NEW)

## Testing

### Transaction Hash Search
1. Search for a transaction hash (0x + 64 hex chars)
2. Should switch to transfers tab
3. Should show filtered table with that transaction
4. Should display orange "Tx:" badge
5. Should show transaction details modal (if search result includes data)

### Block Hash Search
1. Search for a block hash (0x + 64 hex chars)
2. Backend tries as transaction first, then as block hash
3. If found as block hash:
   - Should switch to transfers tab
   - Should show all transfers with that block hash
   - Should display cyan "Block Hash:" badge
4. If not found, shows "not found" message

### Block Number Search
1. Search for a block number (pure digits)
2. Should switch to transfers tab
3. Should show all transfers in that block
4. Should display green "Block:" badge

## Deployment

### Frontend
```bash
cd bzr-frontend
npm run build
rsync -avz --delete dist/ root@159.198.70.88:/var/www/bzr-frontend/
```

**New bundle**: `index-DmbB01G2.js`

### Backend
```bash
ssh root@159.198.70.88 'systemctl restart bzr-backend'
```

**Status**: Active (running) - confirmed ✅

## Verification Steps

1. **Hard refresh browser**: Cmd/Ctrl + Shift + R
2. Test transaction hash search (should filter table + switch to transfers tab)
3. Test block hash search (should filter table by block hash)
4. Test block number search (should still work)
5. Verify all filter badges display correctly
6. Test "Clear all filters" button removes all 4 filter types

## Technical Notes

### Why Block Hash and Transaction Hash Lookups Both Work

The system now intelligently handles 64-character hex strings:

1. **Detection**: Both are detected as type 'transaction' by `detectSearchType()`
2. **Smart Search**: Backend tries transaction hash first
3. **Fallback**: If not found as transaction, tries as block hash
4. **Type Checking**: Frontend checks `result.type` to determine actual result type
5. **Appropriate Filtering**: Sets correct filter based on what was found

This approach works because:
- Most users search for transaction hashes (more common)
- Transaction lookup is tried first (performance)
- Block hash lookup is automatic fallback (convenience)
- Frontend adapts filter based on actual result (flexibility)

### Database Schema
The `transfer_events` table includes:
- `tx_hash`: Transaction hash (indexed)
- `block_hash`: Block hash (may need index for performance)
- `block_number`: Block number (indexed)

Consider adding index on `block_hash` if block hash searches become frequent:
```sql
CREATE INDEX IF NOT EXISTS idx_transfer_events_block_hash 
ON transfer_events(block_hash);
```

## Files Modified

### Backend
- `bzr-backend/server.js`:
  - Added `searchByBlockHash()` function (line ~3600)
  - Modified transaction search case to try both types (line ~3770)

### Frontend
- `bzr-frontend/src/App.tsx`:
  - Added `filterBlockHash` state (line ~498)
  - Updated clear filters logic (line ~547)
  - Enhanced transaction search handling (line ~585)
  - Added block hash filtering logic (line ~1383)
  - Added block hash badge display (line ~1883)
  - Updated clear filters button (line ~1890)
  - Updated dependencies in useMemo (line ~1428)

## Status
✅ **DEPLOYED AND ACTIVE**

Both frontend and backend are deployed to production server (159.198.70.88) and running successfully.
