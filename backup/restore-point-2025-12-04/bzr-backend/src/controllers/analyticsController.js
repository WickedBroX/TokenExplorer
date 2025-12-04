const analyticsService = require('../analyticsService');
const { CHAINS } = require('../config/chains');

const VALID_ANALYTICS_TIME_RANGES = new Set(['7d', '30d', '90d', 'all']);
const BZR_TOKEN_DECIMALS = Number(process.env.BZR_TOKEN_DECIMALS || 18);

const getAnalytics = async (req, res) => {
  const requestStarted = Date.now();

  try {
    const rawTimeRange = typeof req.query.timeRange === 'string' ? req.query.timeRange.toLowerCase() : '30d';
    const timeRange = VALID_ANALYTICS_TIME_RANGES.has(rawTimeRange) ? rawTimeRange : '30d';

    const rawChainId = typeof req.query.chainId === 'string' ? req.query.chainId : (req.query.chainId ?? 'all');
    const normalizedChainId = String(rawChainId).toLowerCase();

    let chainIds;
    if (normalizedChainId === 'all' || normalizedChainId === '0') {
      chainIds = CHAINS.map((chain) => chain.id);
    } else {
      const numericChainId = Number(normalizedChainId);
      if (!Number.isFinite(numericChainId) || numericChainId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid chainId parameter',
          chainId: rawChainId,
        });
      }
      chainIds = [numericChainId];
    }

    try {
      const result = await analyticsService.computePersistentAnalytics({
        timeRange,
        chainIds,
        chains: CHAINS,
        decimals: BZR_TOKEN_DECIMALS,
      });

      const analyticsData = result.analyticsData;
      analyticsData.chainId = normalizedChainId;
      analyticsData.performance.computeTimeMs = Math.max(
        analyticsData.performance.computeTimeMs,
        Date.now() - requestStarted,
      );
      analyticsData.performance.mode = 'persistent';

      return res.json(analyticsData);
    } catch (error) {
      if (error.code !== 'PERSISTENT_STORE_UNAVAILABLE') {
        throw error;
      }

      const fallback = await analyticsService.computeRealtimeAnalyticsFallback({
        timeRange,
        chainIds,
        requestedChainId: normalizedChainId,
      });

      fallback.performance.computeTimeMs = Math.max(
        fallback.performance.computeTimeMs,
        Date.now() - requestStarted,
      );
      fallback.performance.mode = 'realtime';

      return res.json(fallback);
    }
  } catch (error) {
    console.error('[Analytics] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compute analytics',
      details: error.message || String(error),
      timestamp: Date.now(),
    });
  }
};

module.exports = {
  getAnalytics,
};
