const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.TRANSFERS_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.TRANSFERS_DB_SSL === 'true' || process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

const checkDuplicates = async () => {
  console.log('Checking for duplicates on BSC (Chain 56)...');
  
  const res = await pool.query(`
    SELECT tx_hash, count(*) as cnt 
    FROM transfer_events 
    WHERE chain_id = 56 
    GROUP BY tx_hash 
    HAVING count(*) > 1 
    ORDER BY cnt DESC 
    LIMIT 5
  `);

  if (res.rows.length === 0) {
    console.log('No duplicates found based on tx_hash.');
  } else {
    console.log('Found duplicates based on tx_hash:');
    console.table(res.rows);
    
    const hash = res.rows[0].tx_hash;
    console.log(`\nInspecting duplicates for hash: ${hash}`);
    const details = await pool.query(`
      SELECT * FROM transfer_events WHERE chain_id = 56 AND tx_hash = $1
    `, [hash]);
    console.table(details.rows);
  }
  
  pool.end();
};

checkDuplicates().catch(console.error);
