const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.TRANSFERS_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.TRANSFERS_DB_SSL === 'true' || process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

const CHAIN_IDS = [1, 10, 56, 137, 324, 5000, 42161, 43114, 8453];

const runCleanup = async () => {
  console.log('Starting duplicate cleanup for ALL chains...');

  for (const chainId of CHAIN_IDS) {
    console.log(`\n--- Checking Chain ${chainId} ---`);
    try {
      // 1. Find all hashes with duplicates
      const res = await pool.query(`
        SELECT tx_hash, COUNT(*) as cnt
        FROM transfer_events
        WHERE chain_id = $1
        GROUP BY tx_hash
        HAVING COUNT(*) > 1
      `, [chainId]);

      if (res.rows.length === 0) {
        console.log('No duplicates found.');
        continue;
      }

      console.log(`Found ${res.rows.length} transactions with duplicates.`);

      let deletedCount = 0;
      let keptCount = 0;
      let skippedCount = 0;

      for (const row of res.rows) {
        const txHash = row.tx_hash;

        // 2. Get all records for this hash
        const recordsRes = await pool.query(`
          SELECT * FROM transfer_events
          WHERE chain_id = $1 AND tx_hash = $2
        `, [chainId, txHash]);

        const records = recordsRes.rows;
        
        if (deletedCount === 0 && records.length > 0) {
          console.log('Sample duplicate records:', JSON.stringify(records, null, 2));
        }

        // 3. Identify "bad" records (log_index = 0) when a "good" record (log_index != 0) exists
        const hasNonZero = records.some(r => r.log_index !== 0);
        
        if (hasNonZero) {
          const toDelete = records.filter(r => r.log_index === 0);
          
          if (toDelete.length > 0) {
            // Delete them
            for (const badRecord of toDelete) {
              const delRes = await pool.query(`
                DELETE FROM transfer_events
                WHERE chain_id = $1 AND tx_hash = $2 AND log_index = 0
              `, [chainId, txHash]);
              
              if (delRes.rowCount === 0) {
                console.error(`Failed to delete record: Chain ${chainId}, Hash ${txHash}, LogIndex 0`);
              } else {
                deletedCount += delRes.rowCount;
              }
            }
            keptCount += (records.length - toDelete.length);
          } else {
              skippedCount++;
          }
        } else {
          console.warn(`Unexpected: Multiple records with log_index=0 for hash ${txHash}?`);
          skippedCount++;
        }
      }

      console.log(`Deleted ${deletedCount} duplicate records.`);
      console.log(`Kept ${keptCount} valid records.`);
      console.log(`Skipped ${skippedCount} transactions.`);

    } catch (err) {
      console.error(`Error processing chain ${chainId}:`, err);
    }
  }
  
  console.log('\nAll chains processed.');
  await pool.end();
};

runCleanup();
