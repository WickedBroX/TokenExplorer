'use strict';

const requireDatabaseUrl = () => {
  const connectionString = process.env.TRANSFERS_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('! Database URL is not configured (TRANSFERS_DATABASE_URL or DATABASE_URL)');
    return null;
  }
  return connectionString;
};

module.exports = {
  requireDatabaseUrl,
};
