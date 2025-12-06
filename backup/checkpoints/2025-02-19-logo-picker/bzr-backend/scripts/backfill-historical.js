#!/usr/bin/env node

/**
 * Historical Backfill Script for BZR Token Transfers
 * 
 * This script fetches ALL historical transfer events from block 0 to the current
 * ingester cursor position using Etherscan API V2 PRO endpoints.
 * 
 * Features:
 * - Uses PRO plan with 10,000 records per request (vs regular 100)
 * - Load balances across 3 API keys
 * - Tracks progress and resumes from failures
 * - Batch inserts with ON CONFLICT DO NOTHING to avoid duplicates
 * - Supports all 10 chains
 * 
 * Usage:
 *   node scripts/backfill-historical.js [chainId]
 *   
 * Examples:
 *   node scripts/backfill-historical.js 137    # Backfill Polygon only
 *   node scripts/backfill-historical.js all    # Backfill all chains
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const { CHAINS, PROVIDERS, getChainDefinition, buildProviderRequest } = require('../src/config/chains');

// Database connection (use connection string from .env)
const pool = new Pool({
  connectionString: process.env.TRANSFERS_DATABASE_URL,
});

// Configuration
const BZR_ADDRESS = process.env.BZR_TOKEN_ADDRESS || '0x85Cb098bdcD3Ca929d2cD18Fc7A2669fF0362242';
const API_KEYS = (process.env.ETHERSCAN_V2_API_KEY || '').split(',').filter(Boolean);
const PRO_PAGE_SIZE = 10000; // PRO plan allows 10K records per request
const BATCH_INSERT_SIZE = 1000; // Insert 1000 records at a time
const RATE_LIMIT_DELAY = 350; // 350ms = 2.85 requests/sec (safe with 3 keys = ~8.5 req/sec total)

let currentKeyIndex = 0;

// Get next API key for load balancing
function getNextApiKey() {
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return key;
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch current ingester cursor for a chain
async function getCurrentCursor(chainId) {
  const result = await pool.query(
    'SELECT last_block_number FROM transfer_ingest_cursors WHERE chain_id = $1',
    [chainId]
  );
  
  if (result.rows.length === 0) {
    return null; // No cursor yet, chain not ingested
  }
  
  const val = result.rows[0].last_block_number;
  return val ? parseInt(val) : null;
}

// Get backfill progress (if resuming)
async function getBackfillProgress(chainId) {
  try {
    const result = await pool.query(
      `SELECT last_processed_block 
       FROM transfer_backfill_progress 
       WHERE chain_id = $1`,
      [chainId]
    );
    
    if (result.rows.length === 0) {
      return 0; // Start from block 0
    }
    
    return parseInt(result.rows[0].last_processed_block || 0);
  } catch (err) {
    // Fallback for different schema versions or if table doesn't exist
    console.warn('   ⚠️  Could not read backfill progress (schema mismatch?), starting from 0.');
    return 0;
  }
}

// Update backfill progress
async function updateBackfillProgress(chainId, blockNumber, totalFetched) {
  try {
    await pool.query(
      `INSERT INTO transfer_backfill_progress (chain_id, last_processed_block, total_transfers_backfilled, updated_at, status)
       VALUES ($1, $2, $3, NOW(), 'running')
       ON CONFLICT (chain_id) 
       DO UPDATE SET 
         last_processed_block = $2,
         total_transfers_backfilled = COALESCE(transfer_backfill_progress.total_transfers_backfilled, 0) + $3,
         updated_at = NOW(),
         status = 'running'`,
      [chainId, blockNumber, totalFetched]
    );
  } catch (err) {
    console.warn(`   ⚠️  Failed to update progress: ${err.message}`);
  }
}

// Fetch transfers from Etherscan API V2 PRO
// Fetch transfers from Provider (Etherscan V2 or compatible)
async function fetchTransfersFromProvider(chain, startBlock, endBlock, page = 1) {
  // Cronos might have lower limits
  const isCronos = chain.provider === 'cronos';
  const offset = isCronos ? 1000 : PRO_PAGE_SIZE;

  const { provider, params } = buildProviderRequest(chain, {
    module: 'account',
    action: 'tokentx',
    contractaddress: BZR_ADDRESS,
    startblock: startBlock,
    endblock: endBlock,
    page: page,
    offset: offset,
    sort: 'asc',
  });

  // Override API key if needed (buildProviderRequest handles it, but just in case we want local control)
  // For now we trust buildProviderRequest which uses apiUtils

  try {
    // console.log(`Fetching ${chain.name}: Block ${startBlock}-${endBlock} Page ${page} (Offset ${offset})`);
    const response = await axios.get(provider.baseUrl, { 
      params,
      timeout: 30000, // 30 second timeout
    });
    
    const payload = response.data || {};
    
    if (payload.status === '1' && Array.isArray(payload.result)) {
      return payload.result;
    }
    
    if (payload.status === '0') {
      const message = String(payload.message || payload.result || '').toLowerCase();
      
      // No records is OK, means we're done
      if (message.includes('no transactions') || message.includes('no records found')) {
        return [];
      }
      
      const errorDetails = JSON.stringify(payload, null, 2);
      throw new Error(`Provider API error: ${message}\nPayload: ${errorDetails}`);
    }
    
    throw new Error(`Unexpected response: ${JSON.stringify(payload)}`);
  } catch (error) {
    if (error.response) {
      console.error('HTTP Error Details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
        params: error.config?.params
      });
      
      // Don't retry 400 errors (Bad Request) - likely invalid params
      if (error.response.status === 400) {
        throw new Error(`HTTP 400 Bad Request - Check parameters: startBlock=${startBlock}, endBlock=${endBlock}`);
      }
    }

    if (error.response?.status === 429) {
      console.log('  ⚠️  Rate limit hit (HTTP 429), waiting 2 seconds...');
      await sleep(2000);
      return fetchTransfersFromProvider(chain, startBlock, endBlock, page);
    }
    
    // Check if error message contains rate limit info
    if (error.message && error.message.includes('rate limit')) {
      console.log('  ⚠️  Rate limit detected, waiting 2 seconds...');
      await sleep(2000);
      return fetchTransfersFromProvider(chain, startBlock, endBlock, page);
    }
    
    throw error;
  }
}

// Batch insert transfers into database
async function batchInsertTransfers(chainId, transfers) {
  if (transfers.length === 0) return 0;

  const client = await pool.connect();
  let inserted = 0;

  try {
    await client.query('BEGIN');

    // Process in batches
    for (let i = 0; i < transfers.length; i += BATCH_INSERT_SIZE) {
      const batch = transfers.slice(i, i + BATCH_INSERT_SIZE);
      
      const values = [];
      const placeholders = [];
      
      batch.forEach((transfer, idx) => {
        const offset = idx * 10;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
        );
        
        values.push(
          chainId,
          parseInt(transfer.blockNumber),
          transfer.hash,
          parseInt(transfer.transactionIndex || 0),
          new Date(parseInt(transfer.timeStamp) * 1000),
          transfer.from.toLowerCase(),
          transfer.to.toLowerCase(),
          transfer.value,
          transfer.input?.substring(0, 10) || null,
          JSON.stringify(transfer)
        );
      });

      const query = `
        INSERT INTO transfer_events 
        (chain_id, block_number, tx_hash, log_index, time_stamp, from_address, to_address, value, method_id, payload)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING
      `;

      const result = await client.query(query, values);
      inserted += result.rowCount;
    }

    await client.query('COMMIT');
    return inserted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Main backfill function for a single chain
async function backfillChain(chain) {
  const chainId = chain.id;
  const chainName = chain.name;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 Starting backfill for ${chainName} (Chain ID: ${chainId})`);
  console.log(`${'='.repeat(60)}\n`);

  // Get current cursor (where ingester is at)
  let currentCursor = await getCurrentCursor(chainId);
  
  if (!currentCursor) {
    console.log(`⚠️  No ingester cursor found for ${chainName}. Assuming chain is empty.`);
    console.log(`   Fetching latest block number to set as end target...`);
    
    try {
      // We need to fetch the latest block number to know where to stop
      // We can use a simple RPC call or provider specific method
      // For now, let's try to get it from the provider via a small transfer fetch or just assume a high number?
      // Better: use the provider's eth_blockNumber equivalent if available, or just fetch latest transfers and see the block number.
      
      // Let's try to fetch the latest page of transfers to get the latest block
      const latestTransfers = await fetchTransfersFromProvider(chain, 0, 999999999, 1);
      if (latestTransfers && latestTransfers.length > 0) {
        currentCursor = parseInt(latestTransfers[0].blockNumber);
        console.log(`   Found latest block from transfers: ${currentCursor}`);
      } else {
        console.log(`   Could not determine latest block. Defaulting to 999999999.`);
        currentCursor = 999999999;
      }
    } catch (err) {
      console.warn(`   Failed to fetch latest block: ${err.message}. Defaulting to 999999999.`);
      currentCursor = 999999999;
    }
  }

  // Get backfill progress (where we left off, if resuming)
  const lastBackfilledBlock = await getBackfillProgress(chainId);
  
  // For Polygon, token was deployed around October 2024 (block ~60M)
  // Start from block 0 to ensure we don't miss early transfers
  const safeStartBlock = 0;
  const startBlock = lastBackfilledBlock > 0 ? lastBackfilledBlock + 1 : safeStartBlock;
  const endBlock = currentCursor - 1; // Don't overlap with ingester
  
  if (startBlock > endBlock) {
    console.log(`✅ ${chainName} already fully backfilled (blocks 0 to ${currentCursor - 1})`);
    return;
  }

  console.log(`📊 Backfill range: Block ${startBlock} to ${endBlock}`);
  console.log(`   Current ingester cursor: ${currentCursor}`);
  console.log(`   Blocks to backfill: ${endBlock - startBlock + 1}\n`);

  let currentBlock = startBlock;
  let totalFetched = 0;
  let totalInserted = 0;
  const startTime = Date.now();

  // Fetch in chunks (Etherscan limits to 10K results per request)
  // With PRO, we can get 10K records per page
  // Use smaller chunks to avoid API limits
  while (currentBlock <= endBlock) {
    const chunkEnd = Math.min(endBlock, currentBlock + 99999); // 100K block chunks
    
    console.log(`  📥 Fetching blocks ${currentBlock} to ${chunkEnd}...`);
    
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      try {
        const transfers = await fetchTransfersFromProvider(chain, currentBlock, chunkEnd, page);
        
        if (transfers.length === 0) {
          hasMore = false;
          break;
        }

        totalFetched += transfers.length;
        
        // Insert into database
        const inserted = await batchInsertTransfers(chainId, transfers);
        totalInserted += inserted;
        
        console.log(`     Page ${page}: Fetched ${transfers.length}, Inserted ${inserted} (${totalInserted} total)`);
        
        // Update progress after each successful batch
        const lastBlock = Math.max(...transfers.map(t => parseInt(t.blockNumber)));
        await updateBackfillProgress(chainId, lastBlock, inserted);
        
        // If we got less than 10K, we're done with this chunk
        const isCronos = chain.provider === 'cronos';
        if (transfers.length < (isCronos ? 1000 : PRO_PAGE_SIZE)) {
          hasMore = false;
        } else {
          page++;
          await sleep(RATE_LIMIT_DELAY);
        }
      } catch (err) {
        console.error(`     ❌ Error fetching page ${page}: ${err.message}`);
        
        // If it's a 400 error, we should probably abort this chunk or the whole chain
        if (err.message.includes('HTTP 400')) {
             console.error('     🛑 Aborting chunk due to 400 Bad Request.');
             hasMore = false;
             break;
        }
        
        await sleep(2000);
      }
    }
    
    currentBlock = chunkEnd + 1;
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Backfill complete for Chain ${chainId} in ${duration}s`);
  console.log(`   Total Fetched: ${totalFetched}`);
  console.log(`   Total Inserted: ${totalInserted}`);
  
  // Mark as complete
  await pool.query(
    `UPDATE transfer_backfill_progress 
     SET status = 'completed', 
         updated_at = NOW(),
         last_processed_block = $2
     WHERE chain_id = $1`,
    [chainId, endBlock]
  );
}

// Run the script
(async () => {
  try {
    const args = process.argv.slice(2);
    const chainIdArg = args[0];
    
    if (!chainIdArg) {
      console.error('Please provide a chainId (e.g., node scripts/backfill-historical.js 137)');
      process.exit(1);
    }

    if (chainIdArg === 'all') {
      console.log('🚀 Starting backfill for ALL chains...');
      for (const chain of CHAINS) {
        await backfillChain(chain);
      }
    } else {
      const chainId = parseInt(chainIdArg);
      const chainDef = getChainDefinition(chainId);
      
      if (!chainDef) {
         console.error(`Chain ${chainId} not found`);
         process.exit(1);
      }
      
      await backfillChain(chainDef);
    }

    console.log('\n🎉 All requested backfills completed.');
    await pool.end();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
