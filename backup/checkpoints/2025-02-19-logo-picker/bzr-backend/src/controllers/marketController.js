'use strict';

const { getMarketOverview } = require('../services/cmcService');
const { fetchTokenPrice } = require('../services/tokenService');

const getOverview = async (_req, res) => {
  try {
    const market = await getMarketOverview();

    // If price is missing from CMC fallback, try to enrich from existing price pipeline
    if (!market.priceUsd) {
      try {
        const price = await fetchTokenPrice();
        if (price?.priceUsd) {
          market.priceUsd = price.priceUsd;
          if (!market.fdvUsd && market.maxSupply) {
            market.fdvUsd = market.maxSupply * price.priceUsd;
          }
          if (!market.marketCapUsd && market.circulatingSupply) {
            market.marketCapUsd = market.circulatingSupply * price.priceUsd;
          }
          market.warnings = [...(market.warnings || []), 'Price filled from fallback source'];
        }
      } catch (_) {
        // ignore; keep original warnings
      }
    }

    return res.json(market);
  } catch (error) {
    console.error('X Failed to fetch market overview:', error.message || error);
    return res.status(502).json({ message: 'Failed to fetch market overview' });
  }
};

module.exports = {
  getOverview,
};
