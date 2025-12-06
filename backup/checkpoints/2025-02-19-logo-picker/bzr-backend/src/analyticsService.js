const {
  isPersistentStoreReady,
  queryDailyAnalytics,
  queryAnalyticsSummary,
  queryChainDistribution,
  queryTopAddresses,
  queryTopTransfers,
  getMaxTimestamp,
} = require('./persistentStore');
const { resolveTransfersPageData } = require('./services/transfersService');
const { CHAINS } = require('./config/chains');

const ANALYTICS_FALLBACK_MAX_TRANSFERS = Number(process.env.ANALYTICS_FALLBACK_MAX_TRANSFERS || 400);
const ANALYTICS_FALLBACK_MAX_PAGES = Number(process.env.ANALYTICS_FALLBACK_MAX_PAGES || 3);
const ANALYTICS_FALLBACK_PAGE_SIZE = Number(process.env.ANALYTICS_FALLBACK_PAGE_SIZE || 100);

const TIME_RANGE_TO_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const formattersCache = new Map();

const getDisplayFormatter = (locale = 'en-US') => {
  if (!formattersCache.has(locale)) {
    formattersCache.set(
      locale,
      new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
      })
    );
  }
  return formattersCache.get(locale);
};

const convertRawToToken = (value, decimals) => {
  if (!value) {
    return 0;
  }

  const numeric = typeof value === 'string' ? Number(value) : Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  const divisor = 10 ** Math.max(0, Number.parseInt(decimals, 10) || 18);
  return numeric / divisor;
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const roundNumber = (value, precision = 2) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const createTimeline = (startDate, endDate) => {
  const timeline = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);
  const boundary = new Date(endDate);
  boundary.setUTCHours(0, 0, 0, 0);

  while (cursor <= boundary) {
    timeline.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return timeline;
};

const buildPredictionSeries = (values = [], length = 7) => {
  if (!Array.isArray(values) || values.length === 0 || length <= 0) {
    return [];
  }

  const recent = values.slice(-Math.max(2, Math.min(values.length, 5)));
  const deltas = [];
  for (let i = 1; i < recent.length; i += 1) {
    const prev = recent[i - 1];
    const next = recent[i];
    deltas.push(next - prev);
  }

  const avgDelta = deltas.length ? deltas.reduce((acc, value) => acc + value, 0) / deltas.length : 0;
  const baseline = recent[recent.length - 1];
  const predictions = [];

  for (let step = 1; step <= length; step += 1) {
    const projected = Math.max(0, baseline + avgDelta * step);
    predictions.push(roundNumber(projected, 2));
  }

  return predictions;
};

const computeAnomalies = (values = []) => {
  if (!Array.isArray(values) || values.length < 3) {
    return [];
  }

  const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
  const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return [];
  }

  return values
    .map((value, index) => {
      const zScore = (value - mean) / stdDev;
      if (Math.abs(zScore) >= 2) {
        return {
          index,
          value,
          zScore: zScore.toFixed(2),
        };
      }
      return null;
    })
    .filter(Boolean);
};

const computePercentChange = (current, previous) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return null;
  }
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return roundNumber(((current - previous) / previous) * 100, 2);
};

const getChainName = (chains, chainId) => {
  const numericId = Number(chainId);
  const found = Array.isArray(chains) ? chains.find((chain) => Number(chain.id) === numericId) : null;
  return found?.name || `Chain ${numericId}`;
};

const ensurePersistentStoreReady = () => {
  if (!isPersistentStoreReady()) {
    const error = new Error('Persistent store is not ready');
    error.code = 'PERSISTENT_STORE_UNAVAILABLE';
    throw error;
  }
};

const computePersistentAnalytics = async ({
  timeRange,
  chainIds,
  chains,
  decimals,
}) => {
  ensurePersistentStoreReady();

  const now = new Date();
  const normalizedEnd = new Date(now);
  normalizedEnd.setUTCHours(23, 59, 59, 999);

  const rangeDays = TIME_RANGE_TO_DAYS[timeRange] || null;
  let normalizedStart = null;

  if (rangeDays) {
    normalizedStart = new Date(normalizedEnd);
    normalizedStart.setUTCHours(0, 0, 0, 0);
    normalizedStart.setUTCDate(normalizedStart.getUTCDate() - (rangeDays - 1));
  }

  const startTimeMs = Date.now();

  const [dailyRows, summary, chainRows, topAddressRows, topTransferRows, latestTimestamp] = await Promise.all([
    queryDailyAnalytics({ chainId: chainIds, startTime: normalizedStart, endTime: normalizedEnd }),
    queryAnalyticsSummary({ chainId: chainIds, startTime: normalizedStart, endTime: normalizedEnd }),
    queryChainDistribution({ chainId: chainIds, startTime: normalizedStart, endTime: normalizedEnd }),
    queryTopAddresses({ chainId: chainIds, startTime: normalizedStart, endTime: normalizedEnd, limit: 15 }),
    queryTopTransfers({ chainId: chainIds, startTime: normalizedStart, endTime: normalizedEnd, limit: 15 }),
    getMaxTimestamp({ chainId: chainIds }),
  ]);

  let previousSummary = { totalTransfers: 0, volumeRaw: 0, uniqueAddresses: 0 };
  if (rangeDays && normalizedStart) {
    const previousEnd = new Date(normalizedStart);
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
    previousEnd.setUTCHours(23, 59, 59, 999);
    const previousStart = new Date(previousEnd);
    previousStart.setUTCDate(previousStart.getUTCDate() - (rangeDays - 1));
    previousStart.setUTCHours(0, 0, 0, 0);

    previousSummary = await queryAnalyticsSummary({
      chainId: chainIds,
      startTime: previousStart,
      endTime: previousEnd,
    });
  }

  const timeline = normalizedStart ? createTimeline(normalizedStart, normalizedEnd) : dailyRows.map((row) => row.day);
  const timelineKeys = timeline.map((date) => {
    const copy = new Date(date);
    copy.setUTCHours(0, 0, 0, 0);
    return copy.toISOString().split('T')[0];
  });

  const dailyMap = new Map();
  dailyRows.forEach((row) => {
    if (!row.day) {
      return;
    }
    const date = new Date(row.day);
    date.setUTCHours(0, 0, 0, 0);
    const key = date.toISOString().split('T')[0];
    dailyMap.set(key, row);
  });

  const formatter = getDisplayFormatter();
  const dailyData = [];
  const dailyTransferCounts = [];
  const dailyVolumeValues = [];

  timelineKeys.forEach((key, index) => {
    const raw = dailyMap.get(key);
    const date = timeline[index] instanceof Date ? timeline[index] : new Date(key);
    const count = raw?.transferCount || 0;
    const volume = convertRawToToken(raw?.volumeRaw, decimals);
    const medianTransferSize = raw?.medianRaw ? convertRawToToken(raw.medianRaw, decimals) : 0;
    const uniqueAddresses = raw
      ? new Set([...(raw.fromAddresses || []), ...(raw.toAddresses || [])]).size
      : 0;

    const entry = {
      date: key,
      displayDate: formatter.format(date),
      count,
      volume: roundNumber(volume, 4),
      uniqueAddresses,
      avgTransferSize: count > 0 ? roundNumber(volume / count, 4) : 0,
      medianTransferSize,
    };

    dailyData.push(entry);
    dailyTransferCounts.push(count);
    dailyVolumeValues.push(volume);
  });

  const totalTransfers = summary.totalTransfers || dailyTransferCounts.reduce((acc, value) => acc + value, 0);
  const totalVolume = convertRawToToken(summary.volumeRaw, decimals);
  const activeAddresses = summary.uniqueAddresses || 0;
  const daysCount = dailyData.length || 1;

  const sortedCounts = [...dailyTransferCounts].sort((a, b) => a - b);
  const middleIndex = Math.floor(sortedCounts.length / 2);
  const medianDailyTransfers = sortedCounts.length % 2 === 0
    ? (sortedCounts[middleIndex - 1] + sortedCounts[middleIndex]) / 2
    : sortedCounts[middleIndex] || 0;

  const transfersChange = rangeDays ? computePercentChange(totalTransfers, previousSummary.totalTransfers || 0) : null;
  const volumeChange = rangeDays ? computePercentChange(totalVolume, convertRawToToken(previousSummary.volumeRaw, decimals)) : null;
  const addressesChange = rangeDays ? computePercentChange(activeAddresses, previousSummary.uniqueAddresses || 0) : null;

  let peakActivity = null;
  dailyData.forEach((entry) => {
    if (!peakActivity || entry.count > peakActivity.transfers || entry.volume > peakActivity.volume) {
      peakActivity = {
        transfers: entry.count,
        volume: entry.volume,
        date: entry.date,
      };
    }
  });

  const volatility = (() => {
    if (dailyTransferCounts.length < 2) {
      return 0;
    }
    const mean = dailyTransferCounts.reduce((acc, value) => acc + value, 0) / dailyTransferCounts.length;
    const variance = dailyTransferCounts.reduce((acc, value) => acc + (value - mean) ** 2, 0) / dailyTransferCounts.length;
    return roundNumber(Math.sqrt(variance), 2);
  })();

  const predictions = {
    transfers: buildPredictionSeries(dailyTransferCounts, clamp(Math.ceil(daysCount / 4), 3, 7)),
    volume: buildPredictionSeries(dailyVolumeValues, clamp(Math.ceil(daysCount / 4), 3, 7)),
  };

  const anomalies = {
    transferSpikes: computeAnomalies(dailyTransferCounts),
    volumeSpikes: computeAnomalies(dailyVolumeValues),
  };

  const chainDistribution = chainRows.map((row) => {
    const volume = convertRawToToken(row.volumeRaw, decimals);
    const percentage = totalVolume > 0 ? `${roundNumber((volume / totalVolume) * 100, 2)}%` : '0%';
    return {
      chain: getChainName(chains, row.chainId),
      count: row.transferCount,
      volume: roundNumber(volume, 4),
      uniqueAddresses: row.uniqueAddresses,
      percentage,
    };
  });

  const topAddresses = topAddressRows.map((row) => ({
    address: row.address,
    totalTxs: row.totalTxs,
    sent: row.sent,
    received: row.received,
    volume: roundNumber(convertRawToToken(row.volumeRaw, decimals), 4),
  }));

  const topWhales = topTransferRows.map((row) => ({
    hash: row.txHash,
    from: row.from,
    to: row.to,
    value: roundNumber(convertRawToToken(row.volumeRaw, decimals), 4),
    timeStamp: row.timestamp || null,
    chain: getChainName(chains, row.chainId),
  }));

  const computeTimeMs = Date.now() - startTimeMs;

  return {
    analyticsData: {
      success: true,
      timeRange,
      chainId: Array.isArray(chainIds) && chainIds.length === 1 ? String(chainIds[0]) : 'all',
      dailyData,
      analyticsMetrics: {
        totalTransfers,
        totalVolume: roundNumber(totalVolume, 4),
        avgTransferSize: totalTransfers > 0 ? roundNumber(totalVolume / totalTransfers, 4) : 0,
        activeAddresses,
        transfersChange,
        volumeChange,
        addressesChange,
        dailyAvgTransfers: roundNumber(totalTransfers / daysCount, 2),
        dailyAvgVolume: roundNumber(totalVolume / daysCount, 4),
        peakActivity,
        volatility,
        medianDailyTransfers: roundNumber(medianDailyTransfers, 2),
      },
      predictions,
      anomalies,
      chainDistribution,
      topAddresses,
      topWhales,
      performance: {
        computeTimeMs,
        dataPoints: dailyData.length,
        totalTransfersAnalyzed: totalTransfers,
        cacheStatus: 'persistent-cache',
        cacheAge: latestTimestamp?.lagSeconds ?? null,
      },
      timestamp: Date.now(),
    },
    totals: {
      totalTransfers,
      totalVolume,
      activeAddresses,
    },
  };
};

const getAnalyticsRangeStart = (timeRange) => {
  const normalized = typeof timeRange === 'string' ? timeRange.toLowerCase() : '';
  const days = TIME_RANGE_TO_DAYS[normalized];
  if (!days || !Number.isFinite(days)) {
    return null;
  }

  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  return start;
};

const parseTransferTimestampMs = (transfer) => {
  if (!transfer) {
    return null;
  }

  const candidates = [
    transfer.timeStamp,
    transfer.timestamp,
    transfer.time_stamp,
    transfer.blockTimestamp,
  ];

  for (const candidate of candidates) {
    if (candidate === null || typeof candidate === 'undefined') {
      continue;
    }

    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric > 0) {
      if (numeric > 1e12) {
        return numeric;
      }
      if (numeric > 1e9) {
        return numeric * 1000;
      }
      if (numeric > 1e6) {
        return numeric * 1000;
      }
    }

    if (typeof candidate === 'string') {
      const parsedDate = Date.parse(candidate);
      if (!Number.isNaN(parsedDate)) {
        return parsedDate;
      }
    }
  }

  return null;
};

const BZR_TOKEN_DECIMALS = Number(process.env.BZR_TOKEN_DECIMALS || 18);

const buildRealtimeAnalyticsSnapshot = ({ transfers, timeRange, chainIds, requestedChainId }) => {
  const formatter = getDisplayFormatter();
  const rangeStart = getAnalyticsRangeStart(timeRange);
  const rangeEnd = new Date();
  rangeEnd.setUTCHours(23, 59, 59, 999);

  const filtered = [];
  const chainStats = new Map();
  const addressStats = new Map();
  const whaleCandidates = [];

  transfers.forEach((transfer) => {
    const timestampMs = parseTransferTimestampMs(transfer);
    if (!timestampMs) {
      return;
    }

    if (rangeStart && timestampMs < rangeStart.getTime()) {
      return;
    }

    if (timestampMs > rangeEnd.getTime()) {
      return;
    }

    const chainIdValue = Number(
      transfer.chainId ??
      transfer.chain_id ??
      (transfer.chain && transfer.chain.id) ??
      transfer.chainID
    );
    const chainId = Number.isFinite(chainIdValue) ? chainIdValue : null;

    const volume = convertRawToToken(transfer.value, BZR_TOKEN_DECIMALS);
    const fromAddress = (transfer.from || transfer.fromAddress || transfer.from_address || '').toLowerCase();
    const toAddress = (transfer.to || transfer.toAddress || transfer.to_address || '').toLowerCase();

    filtered.push({
      transfer,
      timestampMs,
      chainId,
      volume,
      fromAddress,
      toAddress,
    });

    if (chainId) {
      let chainEntry = chainStats.get(chainId);
      if (!chainEntry) {
        chainEntry = { count: 0, volume: 0, addresses: new Set() };
        chainStats.set(chainId, chainEntry);
      }
      chainEntry.count += 1;
      chainEntry.volume += volume;
      if (fromAddress) chainEntry.addresses.add(fromAddress);
      if (toAddress) chainEntry.addresses.add(toAddress);
    }

    const ensureAddressEntry = (address) => {
      if (!address) {
        return null;
      }
      const key = address.toLowerCase();
      let entry = addressStats.get(key);
      if (!entry) {
        entry = { address: key, sent: 0, received: 0, volume: 0 };
        addressStats.set(key, entry);
      }
      return entry;
    };

    const senderEntry = ensureAddressEntry(fromAddress);
    if (senderEntry) {
      senderEntry.sent += 1;
      senderEntry.volume += volume;
    }

    const receiverEntry = ensureAddressEntry(toAddress);
    if (receiverEntry) {
      receiverEntry.received += 1;
      receiverEntry.volume += volume;
    }

    whaleCandidates.push({
      hash: transfer.hash || transfer.txHash || transfer.tx_hash,
      from: fromAddress,
      to: toAddress,
      value: volume,
      timestamp: Math.floor(timestampMs / 1000),
      chainId,
    });
  });

  const timestamps = filtered.map((entry) => entry.timestampMs);
  const effectiveStart = rangeStart || (timestamps.length ? new Date(Math.min(...timestamps)) : new Date(rangeEnd));
  const effectiveEnd = timestamps.length ? new Date(Math.max(...timestamps)) : new Date(rangeEnd);
  effectiveStart.setUTCHours(0, 0, 0, 0);
  effectiveEnd.setUTCHours(0, 0, 0, 0);

  let timeline = createTimeline(effectiveStart, effectiveEnd);
  if (!timeline.length) {
    timeline = [new Date(effectiveStart)];
  }

  const dayBuckets = new Map();
  filtered.forEach((entry) => {
    const date = new Date(entry.timestampMs);
    date.setUTCHours(0, 0, 0, 0);
    const key = date.toISOString().split('T')[0];

    if (!dayBuckets.has(key)) {
      dayBuckets.set(key, { count: 0, volume: 0, addresses: new Set() });
    }
    const bucket = dayBuckets.get(key);
    bucket.count += 1;
    bucket.volume += entry.volume;
    if (entry.fromAddress) bucket.addresses.add(entry.fromAddress);
    if (entry.toAddress) bucket.addresses.add(entry.toAddress);
  });

  const dailyData = timeline.map((dateObj) => {
    const key = dateObj.toISOString().split('T')[0];
    const bucket = dayBuckets.get(key);
    const count = bucket ? bucket.count : 0;
    const volume = bucket ? bucket.volume : 0;
    const uniqueAddresses = bucket ? bucket.addresses.size : 0;

    return {
      date: key,
      displayDate: formatter.format(dateObj),
      count,
      volume: roundNumber(volume, 4),
      uniqueAddresses,
      avgTransferSize: count > 0 ? roundNumber(volume / count, 4) : 0,
    };
  });

  const dailyTransferCounts = dailyData.map((d) => d.count);
  const dailyVolumeValues = dailyData.map((d) => d.volume);

  const chainDistribution = [];
  chainStats.forEach((stats, chainId) => {
    const totalVolume = filtered.reduce((sum, entry) => sum + entry.volume, 0);
    chainDistribution.push({
      chain: getChainName(CHAINS, chainId),
      count: stats.count,
      volume: roundNumber(stats.volume, 4),
      uniqueAddresses: stats.addresses.size,
      percentage: totalVolume > 0 ? `${roundNumber((stats.volume / totalVolume) * 100, 2)}%` : '0%',
    });
  });

  const totalTransfers = filtered.length;
  const totalVolume = filtered.reduce((sum, entry) => sum + entry.volume, 0);
  const activeAddresses = addressStats.size;
  const daysCount = dailyData.length || 1;

  return {
    analyticsData: {
      summary: {
        totalTransfers,
        totalVolume: roundNumber(totalVolume, 2),
        activeAddresses,
        avgDailyTransfers: roundNumber(totalTransfers / daysCount, 2),
        avgTransferSize: totalTransfers > 0 ? roundNumber(totalVolume / totalTransfers, 4) : 0,
      },
      trends: {
        transfersChange: null,
        volumeChange: null,
        addressesChange: null,
      },
      charts: {
        daily: dailyData,
        distribution: chainDistribution,
      },
      predictions: {
        transfers: buildPredictionSeries(dailyTransferCounts, clamp(Math.ceil(daysCount / 4), 3, 7)),
        volume: buildPredictionSeries(dailyVolumeValues, clamp(Math.ceil(daysCount / 4), 3, 7)),
      },
      anomalies: {
        transferSpikes: computeAnomalies(dailyTransferCounts),
        volumeSpikes: computeAnomalies(dailyVolumeValues),
      },
      chainDistribution,
      topAddresses: [],
      topWhales: [],
      performance: {
        computeTimeMs: 0,
        dataPoints: dailyData.length,
        totalTransfersAnalyzed: totalTransfers,
        cacheStatus: 'realtime-fallback',
        cacheAge: 0,
      },
      timestamp: Date.now(),
    },
    totals: {
      totalTransfers,
      totalVolume,
      activeAddresses,
    },
  };
};

const computeRealtimeAnalyticsFallback = async ({ timeRange, chainIds, requestedChainId }) => {
  const uniqueChainIds = Array.isArray(chainIds) && chainIds.length
    ? [...new Set(chainIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))]
    : CHAINS.map((chain) => chain.id);

  const startTime = Date.now();
  const transfers = [];
  for (const chainId of uniqueChainIds) {
    const chain = CHAINS.find((c) => c.id === chainId);
    if (!chain) {
      continue;
    }

    let page = 1;
    let fetched = 0;
    const perChainLimit = Math.max(50, Math.floor(ANALYTICS_FALLBACK_MAX_TRANSFERS / uniqueChainIds.length));

    while (page <= ANALYTICS_FALLBACK_MAX_PAGES && fetched < perChainLimit) {
      const remaining = perChainLimit - fetched;
      const pageSize = Math.min(ANALYTICS_FALLBACK_PAGE_SIZE, Math.max(10, remaining));

      try {
        const pageResult = await resolveTransfersPageData({
          chain,
          page,
          pageSize,
          sort: 'desc',
          startBlock: undefined,
          endBlock: undefined,
          forceRefresh: false,
        });

        const pageTransfers = Array.isArray(pageResult?.transfers) ? pageResult.transfers : [];
        if (!pageTransfers.length) {
          break;
        }

        pageTransfers.forEach((transfer) => {
          transfers.push({ ...transfer, chainId: chain.id });
        });

        fetched += pageTransfers.length;
        if (pageTransfers.length < pageSize) {
          break;
        }

        page += 1;
      } catch (error) {
        console.warn(`[Analytics] Realtime fallback fetch failed for chain ${chain.name}:`, error.message || error);
        break;
      }
    }
  }

  const snapshot = buildRealtimeAnalyticsSnapshot({
    transfers,
    timeRange,
    chainIds: uniqueChainIds,
    requestedChainId,
  });

  snapshot.analyticsData.performance.computeTimeMs = Date.now() - startTime;
  snapshot.analyticsData.performance.sampleSize = transfers.length;
  snapshot.analyticsData.performance.cacheStatus = transfers.length ? 'realtime-sample' : 'empty';
  return snapshot.analyticsData;
};

module.exports = {
  computePersistentAnalytics,
  computeRealtimeAnalyticsFallback,
  convertRawToToken,

  roundNumber,
  buildPredictionSeries,
  computeAnomalies,
  TIME_RANGE_TO_DAYS,
};
