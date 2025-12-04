const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.TRANSFERS_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.TRANSFERS_DB_SSL === 'true' || process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

const run = async () => {
  const chainId = 56;
  const res = await pool.query('SELECT COUNT(*) FROM transfer_events WHERE chain_id = $1', [chainId]);
  console.log(`Count for Chain ${chainId}: ${res.rows[0].count}`);
  await pool.end();
};

run();
