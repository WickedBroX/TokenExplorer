const { Pool } = require('pg');

let pool = null;

const getDbPool = () => {
  if (!pool) {
    const connectionString = process.env.TRANSFERS_DATABASE_URL || process.env.DATABASE_URL;
    if (connectionString) {
      pool = new Pool({ connectionString });
    }
  }
  return pool;
};

const query = async (text, params) => {
  const p = getDbPool();
  if (!p) {
    throw new Error('Database not configured');
  }
  return await p.query(text, params);
};

module.exports = {
  query,
  getDbPool,
};
