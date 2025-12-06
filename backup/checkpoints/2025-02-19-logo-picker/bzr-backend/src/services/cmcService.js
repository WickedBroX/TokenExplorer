'use strict';

const axios = require('axios');
const { getAthAtlFromCoingecko } = require('./coingeckoAthService');

const CMC_CACHE_TTL_MS = Number(process.env.CMC_CACHE_TTL_MS || 60_000);
const DEFAULT_MAX_SUPPLY = Number(process.env.BZR_TOKEN_MAX_SUPPLY || 555_555_555);
const DEFAULT_TOTAL_SUPPLY = Number(process.env.BZR_TOKEN_TOTAL_SUPPLY || DEFAULT_MAX_SUPPLY);
const DEFAULT_CIRC_SUPPLY = Number(process.env.BZR_TOKEN_CIRC_SUPPLY || DEFAULT_TOTAL_SUPPLY);

let cachedPayload = null;
let cachedAt = 0;

const computeDerived = (payload) => {
  if (!payload) return payload;

  const price = Number(payload.priceUsd) || null;
  const supCandidates = [
    payload.circulatingSupply,
    payload.selfReportedCirculatingSupply,
    payload.totalSupply,
    payload.maxSupply,
  ].filter((v) => Number.isFinite(v) && v > 0);

  if (!payload.marketCapUsd && price && supCandidates.length) {
    payload.marketCapUsd = price * supCandidates[0];
    payload.warnings = [...(payload.warnings || []), 'Market cap derived from available supply'];
  }

  if (!payload.fdvUsd && price && payload.maxSupply) {
    payload.fdvUsd = price * payload.maxSupply;
    payload.warnings = [...(payload.warnings || []), 'FDV derived from max supply'];
  }

  if (!payload.volMarketCapRatio && payload.volume24hUsd && payload.marketCapUsd) {
    payload.volMarketCapRatio = payload.marketCapUsd > 0 ? payload.volume24hUsd / payload.marketCapUsd : null;
  }

  return payload;
};

const normalizeCmcPayload = (entry) => {
  if (!entry) return null;
  const quote = entry.quote?.USD || {};
  const marketCap = Number(quote.market_cap) || null;
  const volume24h = Number(quote.volume_24h) || null;
  const fdv = Number(quote.fully_diluted_market_cap) || null;
  const volumeChange24h = Number(quote.volume_change_24h);
  const volMcapRatio =
    marketCap && marketCap > 0 && volume24h
      ? volume24h / marketCap
      : null;

  return {
    source: 'coinmarketcap',
    priceUsd: Number(quote.price) || null,
    marketCapUsd: marketCap,
    fdvUsd: fdv,
    volume24hUsd: volume24h,
    volumeChange24hPercent: Number.isFinite(volumeChange24h) ? volumeChange24h : null,
    volMarketCapRatio: volMcapRatio,
    circulatingSupply: Number(entry.circulating_supply) || null,
    selfReportedCirculatingSupply: Number(entry.self_reported_circulating_supply) || null,
    totalSupply: Number(entry.total_supply) || null,
    maxSupply: Number(entry.max_supply) || null,
    stale: false,
    warnings: [],
  };
};

const getCmcKey = () => process.env.COINMARKETCAP_API_KEY || '';
const getCmcId = () => process.env.COINMARKETCAP_ID || '';
const getCmcSymbol = () => process.env.COINMARKETCAP_SYMBOL || 'BZR';

const fetchFromCmc = async () => {
  const apiKey = getCmcKey();
  if (!apiKey) {
    const err = new Error('COINMARKETCAP_API_KEY is missing');
    err.code = 'NO_CMC_KEY';
    throw err;
  }

  const id = getCmcId();
  const symbol = getCmcSymbol();
  const params = { convert: 'USD' };
  if (id) {
    params.id = id;
  } else {
    params.symbol = symbol;
  }

  const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
    params,
    headers: {
      'X-CMC_PRO_API_KEY': apiKey,
    },
    timeout: Number(process.env.CMC_TIMEOUT_MS || 10_000),
  });

  const data = response?.data?.data;
  if (!data || typeof data !== 'object') {
    throw new Error('CMC response missing data');
  }

  const firstEntry = id ? data[id] : Object.values(data)[0];
  const normalized = computeDerived(normalizeCmcPayload(firstEntry));
  if (!normalized) {
    throw new Error('CMC response could not be normalized');
  }

  cachedPayload = normalized;
  cachedAt = Date.now();
  return normalized;
};

const fallbackPayload = () => {
  const warning = 'CMC unavailable; using fallback supply and price-derived metrics';
  return {
    source: 'fallback',
    priceUsd: null,
    marketCapUsd: null,
    fdvUsd: null,
    volume24hUsd: null,
    volumeChange24hPercent: null,
    volMarketCapRatio: null,
    circulatingSupply: DEFAULT_CIRC_SUPPLY,
    selfReportedCirculatingSupply: null,
    totalSupply: DEFAULT_TOTAL_SUPPLY,
    maxSupply: DEFAULT_MAX_SUPPLY,
    athUsd: null,
    athDate: null,
    athChangePercent: null,
    atlUsd: null,
    atlDate: null,
    atlChangePercent: null,
    stale: true,
    warnings: [warning],
  };
};

const getMarketOverview = async () => {
  const now = Date.now();
  const isCached = cachedPayload && now - cachedAt < CMC_CACHE_TTL_MS;
  if (isCached) {
    return cachedPayload;
  }

  try {
    const base = await fetchFromCmc();

    try {
      const athAtl = await getAthAtlFromCoingecko();
      cachedPayload = {
        ...base,
        ...athAtl,
        warnings: base.warnings || [],
      };
      cachedAt = Date.now();
      return cachedPayload;
    } catch (error) {
      const warnings = [...(base.warnings || []), 'ATH/ATL unavailable from CoinGecko'];
      cachedPayload = { ...base, warnings };
      cachedAt = Date.now();
      return cachedPayload;
    }
  } catch (error) {
    if (cachedPayload) {
      return { ...cachedPayload, stale: true, warnings: [...(cachedPayload.warnings || []), 'CMC fetch failed; returning cached data'] };
    }
    return fallbackPayload();
  }
};

module.exports = {
  getMarketOverview,
};
