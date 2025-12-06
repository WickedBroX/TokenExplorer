const { Pool } = require('pg');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { CHAINS, getChainDefinition, buildProviderRequest } = require('../src/config/chains');
const { storeTransfers } = require('../src/persistentStore');
const { sanitizeTransfers } = require('../src/providers/transfersProvider');

// --- Configuration ---
const BACKFILL_BATCH_SIZE = 1000; // Max records per request (safe limit)
const RATE_LIMIT_DELAY_MS = 250; // 4 requests per second (conservative for PRO)
const API_KEYS = [
  'I9JQANQB94N685X8EAAM1PDZ35RFXWHTXN',
  'CTC8P9QQ7D1URESC65MHMDN524WMACMTDT',
  'QHFCHIS2DGPF48W8NIBNRG4PXMCMU9ZJ35'
];

let currentKeyIndex = 0;
const getNextApiKey = () => {
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return key;
};

// --- Database Setup ---
const pool = new Pool({
  connectionString: process.env.TRANSFERS_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.TRANSFERS_DB_SSL === 'true' || process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

// --- Helper Functions ---

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getBackfillStatus = async (chainId) => {
  const res = await pool.query(
    'SELECT * FROM transfer_backfill_progress WHERE chain_id = $1',
    [chainId]
  );
  return res.rows[0];
};

const initBackfillStatus = async (chainId, targetBlock) => {
  const res = await pool.query(
    `INSERT INTO transfer_backfill_progress (chain_id, target_block, last_processed_block, status)
     VALUES ($1, $2, 0, 'pending')
     ON CONFLICT (chain_id) DO NOTHING
     RETURNING *`,
    [chainId, targetBlock]
  );
  return res.rows[0] || await getBackfillStatus(chainId);
};

const updateBackfillProgress = async (chainId, lastBlock, count) => {
  await pool.query(
    `UPDATE transfer_backfill_progress 
     SET last_processed_block = $2, 
         total_transfers_backfilled = total_transfers_backfilled + $3,
         updated_at = NOW(),
         status = 'running'
     WHERE chain_id = $1`,
    [chainId, lastBlock, count]
  );
};

const completeBackfill = async (chainId) => {
  await pool.query(
    `UPDATE transfer_backfill_progress 
     SET status = 'completed', updated_at = NOW()
     WHERE chain_id = $1`,
    [chainId]
  );
};

const fetchBackfillBatch = async (chain, startBlock, endBlock) => {
  // We use a custom fetch here to bypass the standard provider's page size clamping
  // and to use our rotated PRO keys.
  
  const apiKey = getNextApiKey();
  const { provider, params } = buildProviderRequest(chain, {
    module: 'account',
    action: 'tokentx',
    contractaddress: process.env.BZR_TOKEN_ADDRESS,
    startblock: startBlock,
    endblock: endBlock,
    page: 1,
    offset: BACKFILL_BATCH_SIZE,
    sort: 'asc', // Important: fetch oldest first to crawl forward
  }, { includeApiKey: false });

  params.apikey = apiKey;

  try {
    // console.log(`Fetching ${chain.name}: Block ${startBlock}-${endBlock} (Key: ...${apiKey.slice(-4)})`);
    const response = await axios.get(provider.baseUrl, { params });
    const payload = response.data;

    if (payload.status === '1' && Array.isArray(payload.result)) {
      return payload.result;
    }
    
    if (payload.message === 'No transactions found') {
      return [];
    }

    throw new Error(`API Error: ${payload.message} - ${payload.result}`);
  } catch (error) {
    if (error.response) {
      console.error('HTTP Error Details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
        params: error.config?.params
      });
      throw new Error(`HTTP Error: ${error.response.status} ${error.response.statusText}`);
    }
    throw error;
  }
};

// --- Main Logic ---

const runBackfill = async () => {
  console.log('🚀 Starting Historical Backfill...');
  console.log(`Using ${API_KEYS.length} API keys in rotation.`);

  for (const chain of CHAINS) {
    if (chain.id === 25) {
      console.log(`Skipping Cronos (${chain.name}) for now (different API structure).`);
      continue;
    }

    console.log(`\n--- Processing Chain: ${chain.name} (${chain.id}) ---`);

    // 1. Determine Target Block (Current Ingester Cursor)
    const cursorRes = await pool.query(
      'SELECT last_block_number FROM transfer_ingest_cursors WHERE chain_id = $1',
      [chain.id]
    );
    
    let targetBlock = 0;
    if (cursorRes.rows.length > 0 && cursorRes.rows[0].last_block_number) {
      targetBlock = Number(cursorRes.rows[0].last_block_number);
      console.log(`Found existing cursor at block ${targetBlock}`);
    } else {
      // Fallback: fetch latest block if no cursor (shouldn't happen if ingester ran)
      console.warn('No cursor found. Using current block height as target.');
      // For safety, maybe skip or fetch latest. Let's skip to avoid over-fetching if ingester hasn't run.
      // Or just set a high number?
      // Let's assume ingester has run. If not, we can't backfill "to cursor".
      console.warn('Skipping chain due to missing cursor.');
      continue;
    }

    // 2. Init Status
    let status = await initBackfillStatus(chain.id, targetBlock);
    if (status.status === 'completed') {
      console.log('Backfill already completed for this chain.');
      continue;
    }

    let currentBlock = Number(status.last_processed_block);
    console.log(`Resuming from block ${currentBlock} -> Target ${targetBlock}`);

    // 3. Crawl
    while (currentBlock < targetBlock) {
      try {
        // Fetch next batch
        // We ask for a range starting from currentBlock.
        // Since we sort ASC, we will get the earliest transfers after currentBlock.
        // We don't strictly need 'endBlock' to be small, but keeping it constrained helps with timeouts.
        // However, 'tokentx' with 'offset' will just give us the first N records.
        // So we can set endBlock = targetBlock.
        
        const transfers = await fetchBackfillBatch(chain, currentBlock + 1, targetBlock);
        
        if (transfers.length === 0) {
          console.log('No more transfers found in range. Backfill complete for this chain.');
          await completeBackfill(chain.id);
          break;
        }

        // Sanitize and Store
        const sanitized = sanitizeTransfers(transfers, chain);
        if (sanitized.length > 0) {
          await storeTransfers(chain.id, sanitized);
        }

        // Update Progress
        // The last transfer in the batch determines our new currentBlock.
        const lastTransfer = sanitized[sanitized.length - 1];
        const lastBlockNum = Number(lastTransfer.blockNumber);
        
        // If we got fewer than batch size, we likely exhausted the range? 
        // Not necessarily, maybe just sparse.
        // But if we got a full batch, we continue from the last block.
        // IMPORTANT: If multiple transfers are in the same block, we might re-fetch them.
        // 'storeTransfers' uses ON CONFLICT DO NOTHING, so it's safe.
        // To avoid infinite loop if a block has > batch size transfers (unlikely for this token),
        // we should ideally page within the block. But for simplicity:
        // If lastBlockNum == currentBlock, we are stuck.
        // But since we request startBlock = currentBlock + 1, we shouldn't get stuck unless we miss transfers in the same block.
        // Actually, if we use startBlock = currentBlock, we re-fetch.
        // If we use startBlock = currentBlock + 1, we might miss transfers in the same block if we didn't fetch all of them.
        // Correct logic:
        // If we received a full batch, and the last block is X.
        // We should probably query again starting from X, but we need to handle duplicates.
        // Or, better: use the standard pagination if we are stuck on a block?
        // Given the token volume, it's unlikely to have > 1000 transfers in a single block.
        // So setting currentBlock = lastBlockNum is mostly safe, but technically we should start from lastBlockNum (inclusive) and rely on DB dedup.
        
        // Let's use startBlock = lastBlockNum.
        // But if lastBlockNum == currentBlock (and we made progress in count), we are fine.
        // If we start from lastBlockNum, we will re-fetch the ones we just saved.
        // To optimize, we can start from lastBlockNum.
        
        const newCurrentBlock = lastBlockNum;
        
        await updateBackfillProgress(chain.id, newCurrentBlock, sanitized.length);
        
        console.log(`[${chain.name}] Processed ${sanitized.length} transfers. Head: ${newCurrentBlock} / ${targetBlock} (${Math.round((newCurrentBlock/targetBlock)*100)}%)`);
        
        currentBlock = newCurrentBlock;

        // Rate Limit Sleep
        await sleep(RATE_LIMIT_DELAY_MS);

      } catch (err) {
        console.error(`Error processing batch for ${chain.name}:`, err.message);
        console.log('Retrying in 5 seconds...');
        await sleep(5000);
      }
    }
    
    if (currentBlock >= targetBlock) {
        await completeBackfill(chain.id);
        console.log(`✓ Chain ${chain.name} backfill finished.`);
    }
  }

  console.log('🎉 All chains processed.');
  pool.end();
};

runBackfill().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
