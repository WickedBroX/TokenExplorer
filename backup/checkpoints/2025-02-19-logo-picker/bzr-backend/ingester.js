'use strict';

require('dotenv').config();

const persistentStore = require('./src/persistentStore');
const { startTransferIngestion, stopTransferIngestion } = require('./src/transfersIngestion');
const {
  CHAINS,
  fetchTransfersPageFromChain,
  fetchTransfersTotalCount,
} = require('./src/providers/transfersProvider');
const {
  bootstrapConfig,
  loadApiCredentialsFromDb,
  getProviderApiKeys,
} = require('./src/services/configService');

const logger = console;

const createFetchPage = () => async ({ chain, page, pageSize, sort, startBlock, endBlock }) => {
  return fetchTransfersPageFromChain({ chain, page, pageSize, sort, startBlock, endBlock });
};

const createFetchTotal = () => async ({ chain }) => {
  return fetchTransfersTotalCount({ chain });
};

const CONFIG_REFRESH_INTERVAL_MS = Number(process.env.CONFIG_REFRESH_INTERVAL_MS || 60_000);
let refreshTimer = null;
let ingestionController = null;

const refreshApiKeysFromDb = async () => {
  try {
    await loadApiCredentialsFromDb();
  } catch (error) {
    logger.warn('! Failed to refresh API keys from DB:', error.message || error);
  }
  const keys = getProviderApiKeys();
  const keyCount = Array.isArray(keys.etherscan) ? keys.etherscan.length : 0;
  if (!keyCount) {
    logger.warn('! Etherscan API keys missing; ingester will pause until keys are configured.');
  }
  return keyCount > 0;
};

const ensureIngestionStarted = ({ chains, fetchPage, fetchTotal }) => {
  if (ingestionController) return;
  const hasKeys = Array.isArray(getProviderApiKeys().etherscan) && getProviderApiKeys().etherscan.length > 0;
  if (!hasKeys) {
    logger.warn('! Skipping ingestion start because no Etherscan API keys are available yet.');
    return;
  }
  ingestionController = startTransferIngestion({
    chains,
    fetchPage,
    fetchTotal,
    logger,
  });
};

const start = async () => {
  logger.log('🚀 Starting BZR ingester service...');

  await bootstrapConfig();
  await refreshApiKeysFromDb();

  const storeStatus = await persistentStore.initPersistentStore();
  if (!storeStatus.enabled) {
    logger.error('X Persistent store disabled – cannot start ingester');
    process.exit(1);
  }

  if (!storeStatus.ready) {
    logger.error('X Persistent store not ready – cannot start ingester');
    process.exit(1);
  }

  ensureIngestionStarted({
    chains: CHAINS,
    fetchPage: createFetchPage(),
    fetchTotal: createFetchTotal(),
  });

  if (!refreshTimer && CONFIG_REFRESH_INTERVAL_MS > 0) {
    refreshTimer = setInterval(async () => {
      const available = await refreshApiKeysFromDb();
      if (available) {
        ensureIngestionStarted({
          chains: CHAINS,
          fetchPage: createFetchPage(),
          fetchTotal: createFetchTotal(),
        });
      }
    }, CONFIG_REFRESH_INTERVAL_MS);
  }

  const shutdown = async (signal) => {
    logger.warn(`⚠️  Received ${signal}. Shutting down ingester...`);
    try {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      stopTransferIngestion();
      await persistentStore.closePersistentStore();
    } catch (error) {
      logger.error('X Error during ingester shutdown:', error.message || error);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown.bind(null, 'SIGINT'));
  process.on('SIGTERM', shutdown.bind(null, 'SIGTERM'));

  process.on('unhandledRejection', (error) => {
    logger.error('X Unhandled promise rejection in ingester:', error);
  });

  return ingestionController;
};

start().catch((error) => {
  logger.error('X Failed to start ingester:', error.message || error);
  process.exit(1);
});
