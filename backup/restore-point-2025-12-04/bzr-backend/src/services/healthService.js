const axios = require('axios');
const persistentStore = require('../persistentStore');
const { CHAINS, getChainDefinition } = require('../config/chains');
const { normalizeChainSnapshots } = require('./transfersService');
const { getNextApiKey } = require('../utils/apiUtils');

const INGEST_STALE_THRESHOLD_SECONDS = Number(process.env.INGEST_STALE_THRESHOLD_SECONDS || 900);
const FINALITY_FALLBACK_RPC_URL = process.env.FINALITY_FALLBACK_RPC_URL || 'https://rpc.ankr.com/eth';
const API_V2_BASE_URL = 'https://api.etherscan.io/v2/api';
const SERVER_START_TIME = Date.now();

const parseFinalizedBlockPayload = (result, source) => {
  if (!result) {
    throw new Error(`[${source}] Finalized block response empty`);
  }

  if (typeof result.number === 'undefined') {
    throw new Error(`[${source}] Finalized block response missing number`);
  }

  const blockNumberHex = result.number;
  const blockNumber = Number.parseInt(blockNumberHex, 16);

  if (!Number.isFinite(blockNumber)) {
    throw new Error(`[${source}] Invalid block number: ${blockNumberHex}`);
  }

  return {
    blockNumber,
    blockNumberHex,
    timestamp: Date.now(),
    source,
  };
};

const fetchFinalizedBlockFromEtherscan = async () => {
  const params = {
    chainid: 1,
    apikey: getNextApiKey(),
    module: 'proxy',
    action: 'eth_getBlockByNumber',
    tag: 'finalized',
    boolean: 'true',
  };

  try {
    const response = await axios.get(API_V2_BASE_URL, { params });
    const result = response.data?.result;

    return parseFinalizedBlockPayload(result, 'etherscan');
  } catch (error) {
    console.error('X Failed to fetch finalized block:', error.message || error);
    throw error;
  }
};

const fetchFinalizedBlockFromRpc = async () => {
  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'eth_getBlockByNumber',
    params: ['finalized', true],
  };

  try {
    const response = await axios.post(
      FINALITY_FALLBACK_RPC_URL,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (response.data?.error) {
      const message = response.data.error?.message || 'Unknown RPC error';
      const code = response.data.error?.code;
      throw new Error(`[rpc:${FINALITY_FALLBACK_RPC_URL}] ${message}${typeof code !== 'undefined' ? ` (code ${code})` : ''}`);
    }

    return parseFinalizedBlockPayload(response.data?.result, `rpc:${FINALITY_FALLBACK_RPC_URL}`);
  } catch (error) {
    console.error('X Fallback RPC finalized block request failed:', error.message || error);
    throw error;
  }
};

const fetchFinalizedBlock = async () => {
  try {
    return await fetchFinalizedBlockFromEtherscan();
  } catch (primaryError) {
    const message = primaryError?.response?.data?.error?.message || primaryError?.response?.data?.message || primaryError?.message || '';
    const code = primaryError?.response?.data?.error?.code;
    const shouldFallback =
      code === -32602 ||
      /invalid hex string/i.test(message) ||
      /unsupported/i.test(message) ||
      /missing number/i.test(message) ||
      /response empty/i.test(message);

    if (!shouldFallback) {
      throw primaryError;
    }

    console.warn('! Etherscan does not support finalized tag currently — attempting fallback RPC.');

    try {
      return await fetchFinalizedBlockFromRpc();
    } catch (fallbackError) {
      const aggregate = new Error('Failed to fetch finalized block from both Etherscan and fallback RPC');
      aggregate.cause = {
        primaryError: primaryError.message || primaryError,
        fallbackError: fallbackError.message || fallbackError,
      };
      throw aggregate;
    }
  }
};

const getPersistentWarmSummary = async () => {
  if (!persistentStore.isPersistentStoreReady()) {
    return {
      chains: [],
      timestamp: null,
    };
  }

  const summary = await persistentStore.getLatestIngestSummary();
  const now = Date.now();
  const chains = summary.map((entry) => {
    const chain = getChainDefinition(entry.chainId) || { name: `Chain ${entry.chainId}` };
    return {
      chainId: entry.chainId,
      chainName: chain.name,
      lastBlockNumber: entry.lastBlockNumber || null,
      lastTime: entry.lastTime ? new Date(entry.lastTime).toISOString() : null,
      lagSeconds: typeof entry.lagSeconds === 'number' ? entry.lagSeconds : null,
      updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : null,
    };
  });

  return {
    chains,
    timestamp: now,
  };
};

const getSystemHealth = async () => {
  const now = Date.now();
  const uptimeSeconds = Math.floor(process.uptime());
  const storeEnabled = persistentStore.isPersistentStoreEnabled();
  const storeReadyFlag = persistentStore.isPersistentStoreReady();
  const persistentStoreInitError = persistentStore.getPersistentStoreError();

  let rawSnapshots = [];
  const warningItems = [];

  if (storeEnabled && storeReadyFlag) {
    try {
      rawSnapshots = await persistentStore.getChainSnapshots(CHAINS.map((chain) => chain.id));
    } catch (error) {
      warningItems.push({
        scope: 'store',
        code: 'STORE_SNAPSHOT_FAILED',
        message: error.message || 'Failed to load chain snapshots metadata.',
        retryable: true,
      });
    }
  }

  const snapshots = normalizeChainSnapshots(rawSnapshots);
  const totalTransfers = snapshots.reduce((sum, snapshot) => sum + (snapshot.totalTransfers || 0), 0);
  const indexLagSec = snapshots.reduce((max, snapshot) => {
    if (typeof snapshot.indexLagSeconds === 'number') {
      return max === null ? snapshot.indexLagSeconds : Math.max(max, snapshot.indexLagSeconds);
    }
    return max;
  }, null);
  const ready = Boolean(storeEnabled && storeReadyFlag) && (snapshots.length > 0 ? snapshots.every((snapshot) => snapshot.ready) : true);
  const stale = typeof indexLagSec === 'number' ? indexLagSec > INGEST_STALE_THRESHOLD_SECONDS : !ready;
  const chainsReadyCount = snapshots.filter((snapshot) => snapshot.ready).length;
  const chainsStaleCount = snapshots.filter((snapshot) => snapshot.stale).length;
  const chainsFailingCount = snapshots.filter((snapshot) => (snapshot.consecutiveFailures || 0) > 0).length;
  const maxConsecutiveFailures = snapshots.reduce((max, snapshot) => {
    const failures = Number(snapshot.consecutiveFailures || 0);
    return Number.isFinite(failures) ? Math.max(max, failures) : max;
  }, 0);
  const maxBackoffUntilMs = snapshots.reduce((latest, snapshot) => {
    if (!snapshot.backoffUntil) {
      return latest;
    }
    const value = Date.parse(snapshot.backoffUntil);
    if (!Number.isFinite(value)) {
      return latest;
    }
    return !latest || value > latest ? value : latest;
  }, null);
  const maxBackoffUntilIso = typeof maxBackoffUntilMs === 'number' ? new Date(maxBackoffUntilMs).toISOString() : null;
  const ingesterSupervisor = process.env.INGESTER_SUPERVISOR || 'systemd';
  const ingesterStatus = !storeEnabled
    ? 'disabled'
    : !storeReadyFlag
      ? 'initializing'
      : (chainsFailingCount > 0 || stale)
        ? 'degraded'
        : ready
          ? 'ok'
          : 'initializing';

  if (!storeEnabled) {
    warningItems.push({
      scope: 'store',
      code: 'STORE_DISABLED',
      message: 'Persistent store is disabled; API will rely on upstream providers.',
      retryable: false,
    });
  } else if (!storeReadyFlag) {
    warningItems.push({
      scope: 'store',
      code: 'STORE_INITIALIZING',
      message: 'Persistent store initialization in progress; ingestion may be unavailable.',
      retryable: true,
    });
  }

  if (persistentStoreInitError) {
    warningItems.push({
      scope: 'store',
      code: 'STORE_INIT_ERROR',
      message: persistentStoreInitError.message,
      retryable: true,
    });
  }

  if (stale) {
    warningItems.push({
      scope: 'ingester',
      code: 'STORE_DATA_STALE',
      message: 'Latest ingested data is stale; serving last successful snapshot.',
      retryable: true,
    });
  }

  if (chainsFailingCount > 0) {
    warningItems.push({
      scope: 'ingester',
      code: 'INGESTER_FAILURES',
      message: `${chainsFailingCount} chain(s) reporting repeated ingestion failures.`,
      retryable: true,
    });
  }

  const lastSuccessAt = snapshots.reduce((latest, snapshot) => {
    if (!snapshot.lastSuccessAt) {
      return latest;
    }
    const value = Date.parse(snapshot.lastSuccessAt);
    if (!Number.isFinite(value)) {
      return latest;
    }
    if (!latest || value > latest) {
      return value;
    }
    return latest;
  }, null);

  const lastErrorAt = snapshots.reduce((latest, snapshot) => {
    if (!snapshot.lastErrorAt) {
      return latest;
    }
    const value = Date.parse(snapshot.lastErrorAt);
    if (!Number.isFinite(value)) {
      return latest;
    }
    if (!latest || value > latest) {
      return value;
    }
    return latest;
  }, null);

  const status = !storeEnabled
    ? 'upstream-only'
    : !storeReadyFlag
      ? 'initializing'
      : stale
        ? 'degraded'
        : 'ok';

  const chainStatuses = snapshots.map((snapshot) => ({
    ...snapshot,
    lagHuman: typeof snapshot.indexLagSeconds === 'number' ? `${snapshot.indexLagSeconds}s` : null,
  }));

  return {
    status,
    timestamp: new Date(now).toISOString(),
    uptimeSeconds,
    uptime: {
      seconds: uptimeSeconds,
      startedAt: new Date(SERVER_START_TIME).toISOString(),
    },
    meta: {
      ready,
      stale,
      indexLagSec: indexLagSec === null ? null : indexLagSec,
      totalTransfers,
    },
    store: {
      enabled: storeEnabled,
      ready: storeReadyFlag,
      error: persistentStoreInitError ? persistentStoreInitError.message : null,
    },
    chains: chainStatuses,
    services: {
      backend: {
        pid: process.pid,
        status: 'ok',
      },
      ingester: {
        managedBy: ingesterSupervisor,
        status: ingesterStatus,
        lastSuccessAt: lastSuccessAt ? new Date(lastSuccessAt).toISOString() : null,
        lastErrorAt: lastErrorAt ? new Date(lastErrorAt).toISOString() : null,
        summary: {
          chains: snapshots.length,
          chainsReady: chainsReadyCount,
          chainsStale: chainsStaleCount,
          chainsFailing: chainsFailingCount,
          maxConsecutiveFailures,
          maxBackoffUntil: maxBackoffUntilIso,
          maxLagSeconds: typeof indexLagSec === 'number' ? indexLagSec : null,
        },
      },
    },
    warnings: warningItems,
  };
};

module.exports = {
  fetchFinalizedBlock,
  getSystemHealth,
  getPersistentWarmSummary,
  SERVER_START_TIME,
};
