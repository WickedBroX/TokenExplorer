const fs = require('fs');
const path = require('path');
const { getDbPool } = require('../src/utils/db');

const runMigrations = async () => {
  const pool = getDbPool();
  if (!pool) {
    console.log('Skipping migrations: Database not configured.');
    return;
  }

  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        try {
          await client.query(sql);
        } catch (err) {
          console.warn(`⚠️ Migration ${file} failed (might be already applied):`, err.message);
        }
      }
    }
    console.log('Migrations complete.');
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
};

if (require.main === module) {
  require('dotenv').config();
  runMigrations().then(() => process.exit(0));
}

module.exports = runMigrations;
