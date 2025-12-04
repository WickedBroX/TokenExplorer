const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { CHAINS } = require('../src/config/chains');

const pool = new Pool({
  connectionString: process.env.TRANSFERS_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.TRANSFERS_DB_SSL === 'true' || process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

const evaluateBackfill = async () => {
  console.log('📊 Evaluating Backfill Requirements...');
  console.log('=======================================');

  try {
    const res = await pool.query(`
      SELECT 
        t.chain_id,
        t.total_transfers as local_total,
        t.upstream_total_transfers as upstream_total,
        t.upstream_updated_at
      FROM transfer_chain_totals t
    `);

    const totalsMap = new Map();
    res.rows.forEach(row => {
      totalsMap.set(row.chain_id, row);
    });

    console.log('| Chain ID | Chain Name | Local Count | Upstream Count | Difference | Status |');
    console.log('|----------|------------|-------------|----------------|------------|--------|');

    let totalMissing = 0;

    for (const chain of CHAINS) {
      const stats = totalsMap.get(chain.id);
      const local = stats ? parseInt(stats.local_total || 0) : 0;
      const upstream = stats ? parseInt(stats.upstream_total || 0) : 0;
      const diff = Math.max(0, upstream - local);
      
      totalMissing += diff;

      let status = '✅ Synced';
      if (diff > 0) {
        const percent = upstream > 0 ? ((local / upstream) * 100).toFixed(1) : '0.0';
        status = `⚠️  ${percent}%`;
      }
      if (upstream === 0 && local === 0) status = '❓ Unknown';

      console.log(`| ${chain.id.toString().padEnd(8)} | ${chain.name.padEnd(10)} | ${local.toString().padEnd(11)} | ${upstream.toString().padEnd(14)} | ${diff.toString().padEnd(10)} | ${status} |`);
    }

    console.log('=======================================');
    console.log(`Total Missing Transfers: ${totalMissing.toLocaleString()}`);
    
    if (totalMissing > 0) {
      const estimatedRequests = Math.ceil(totalMissing / 10000); // Assuming PRO plan 10k limit
      console.log(`Estimated API Requests (PRO): ~${estimatedRequests}`);
    }

  } catch (error) {
    console.error('Error evaluating backfill:', error);
  } finally {
    await pool.end();
  }
};

evaluateBackfill();
