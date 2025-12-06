'use strict';

const axios = require('axios');

const COINGECKO_ID = (process.env.TOKEN_PRICE_COINGECKO_ID || 'bazaars').trim();
const ENABLED = COINGECKO_ID.length > 0 && COINGECKO_ID.toLowerCase() !== 'disabled';
const TTL_MS = Number(process.env.COINGECKO_MARKET_TTL_MS || 6 * 60 * 60 * 1000); // default 6h
const TIMEOUT_MS = Number(process.env.COINGECKO_MARKET_TIMEOUT_MS || 5000);

let cached = null;
let cachedAt = 0;

const parseNumber = (val) => {
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

const getAthAtlFromCoingecko = async () => {
  if (!ENABLED) {
    const err = new Error('CoinGecko ATH/ATL disabled');
    err.code = 'COINGECKO_DISABLED';
    throw err;
  }

  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) {
    return cached;
  }

  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(COINGECKO_ID)}`;
  const params = {
    localization: 'false',
    tickers: 'false',
    market_data: 'true',
    community_data: 'false',
    developer_data: 'false',
    sparkline: 'false',
  };

  const response = await axios.get(url, { params, timeout: TIMEOUT_MS });
  const marketData = response?.data?.market_data || {};

  const athUsd = parseNumber(marketData.ath?.usd);
  const atlUsd = parseNumber(marketData.atl?.usd);
  const athDate = marketData.ath_date?.usd || null;
  const atlDate = marketData.atl_date?.usd || null;
  const athChangePercent = parseNumber(marketData.ath_change_percentage?.usd);
  const atlChangePercent = parseNumber(marketData.atl_change_percentage?.usd);

  const payload = {
    athUsd,
    atlUsd,
    athDate,
    atlDate,
    athChangePercent,
    atlChangePercent,
    source: `coingecko:${COINGECKO_ID}`,
  };

  cached = payload;
  cachedAt = now;
  return payload;
};

module.exports = {
  getAthAtlFromCoingecko,
};
