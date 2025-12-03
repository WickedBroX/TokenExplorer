const axios = require('axios');
const { PROVIDERS } = require('../config/chains');
const { getNextApiKey, isProOnlyResponse } = require('../utils/apiUtils');

const BZR_ADDRESS = process.env.BZR_TOKEN_ADDRESS;
const TOKEN_PRICE_COINGECKO_ID = (process.env.TOKEN_PRICE_COINGECKO_ID || 'bazaars').trim();
const TOKEN_PRICE_COINGECKO_TIMEOUT_MS = Number(process.env.TOKEN_PRICE_COINGECKO_TIMEOUT_MS || 5_000);
const TOKEN_PRICE_COINGECKO_ENABLED = TOKEN_PRICE_COINGECKO_ID.length > 0 && TOKEN_PRICE_COINGECKO_ID.toLowerCase() !== 'disabled';

const TOKEN_PRICE_FALLBACK_ENABLED = (process.env.TOKEN_PRICE_FALLBACK_ENABLED || 'true') === 'true';
const TOKEN_PRICE_FALLBACK_QUERY = process.env.TOKEN_PRICE_FALLBACK_QUERY || 'BZR/USDT';

const parsePositiveNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric;
};

const fetchTokenPriceFromEtherscan = async () => {
  const params = {
    chainid: 1,
    apikey: getNextApiKey(),
    module: 'token',
    action: 'tokeninfo',
    contractaddress: BZR_ADDRESS,
  };

  try {
    const response = await axios.get(PROVIDERS.etherscan.baseUrl, { params });
    if (response.data?.status === '1' && Array.isArray(response.data.result) && response.data.result.length) {
      const [tokenInfo] = response.data.result;
      const numericPrice = Number(tokenInfo.tokenPriceUSD);
      return {
        available: true,
        priceUsd: Number.isFinite(numericPrice) ? numericPrice : null,
        priceUsdRaw: tokenInfo.tokenPriceUSD,
        source: 'etherscan',
        timestamp: Date.now(),
        proRequired: false,
      };
    }

    if (isProOnlyResponse(response.data)) {
      return {
        available: false,
        priceUsd: null,
        priceUsdRaw: null,
        source: 'etherscan',
        timestamp: Date.now(),
        proRequired: true,
        message: response.data?.result || response.data?.message || 'Pro endpoint required',
      };
    }

    const errorMessage = response.data?.message || 'Unknown error fetching token price';
    throw new Error(errorMessage);
  } catch (error) {
    if (error.response?.data && isProOnlyResponse(error.response.data)) {
      return {
        available: false,
        priceUsd: null,
        priceUsdRaw: null,
        source: 'etherscan',
        timestamp: Date.now(),
        proRequired: true,
        message: error.response.data.result || error.response.data.message || 'Pro endpoint required',
      };
    }

    console.error('X Failed to fetch token price:', error.message || error);
    throw error;
  }
};

const fetchTokenPriceFromCoingecko = async () => {
  if (!TOKEN_PRICE_COINGECKO_ENABLED) {
    const error = new Error('CoinGecko price source disabled');
    error.code = 'COINGECKO_DISABLED';
    throw error;
  }

  const endpoint = 'https://api.coingecko.com/api/v3/simple/price';
  const params = {
    ids: TOKEN_PRICE_COINGECKO_ID,
    vs_currencies: 'usd',
    include_last_updated_at: 'true',
  };

  try {
    const response = await axios.get(endpoint, {
      params,
      timeout: TOKEN_PRICE_COINGECKO_TIMEOUT_MS,
    });

    const payload = response?.data || {};
    const entry = payload?.[TOKEN_PRICE_COINGECKO_ID];
    const usdRaw = entry?.usd;
    const priceUsd = parsePositiveNumber(usdRaw);

    if (!priceUsd || priceUsd <= 0) {
      throw new Error('CoinGecko returned no USD price');
    }

    const lastUpdatedAt = Number(entry?.last_updated_at);
    const timestamp = Number.isFinite(lastUpdatedAt) && lastUpdatedAt > 0
      ? lastUpdatedAt * 1000
      : Date.now();

    return {
      available: true,
      priceUsd,
      priceUsdRaw: typeof usdRaw === 'string' ? usdRaw : String(priceUsd),
      source: `coingecko:${TOKEN_PRICE_COINGECKO_ID}`,
      timestamp,
      proRequired: false,
      message: 'Price provided by CoinGecko',
    };
  } catch (error) {
    if (error.response?.data) {
      const wrapped = new Error(error.message || 'CoinGecko request failed');
      wrapped.code = 'COINGECKO_HTTP_ERROR';
      wrapped.payload = error.response.data;
      throw wrapped;
    }

    throw error;
  }
};

const fetchTokenPriceFromDexscreener = async () => {
  if (!TOKEN_PRICE_FALLBACK_ENABLED) {
    throw new Error('Token price fallback disabled');
  }

  const query = TOKEN_PRICE_FALLBACK_QUERY;
  if (!query) {
    throw new Error('Token price fallback query not configured');
  }

  const endpoint = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(endpoint, { timeout: 5000 });
    const pairs = response.data?.pairs || [];
    
    if (!pairs.length) {
      throw new Error('No pairs found on DexScreener');
    }

    // Sort by liquidity to get the most relevant pair
    pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    const bestPair = pairs[0];
    const priceUsd = parsePositiveNumber(bestPair.priceUsd);

    if (!priceUsd) {
      throw new Error('Invalid price from DexScreener');
    }

    return {
      available: true,
      priceUsd,
      priceUsdRaw: bestPair.priceUsd,
      source: 'dexscreener',
      timestamp: Date.now(),
      proRequired: false,
      message: `Price from ${bestPair.dexId} (${bestPair.baseToken.symbol}/${bestPair.quoteToken.symbol})`,
    };
  } catch (error) {
    console.error('X Failed to fetch token price from DexScreener:', error.message || error);
    throw error;
  }
};

const fetchTokenPrice = async () => {
  // 1. Try Etherscan
  try {
    const result = await fetchTokenPriceFromEtherscan();
    if (result.available && result.priceUsd) {
      return result;
    }
  } catch (error) {
    // Continue to next provider
  }

  // 2. Try Coingecko
  if (TOKEN_PRICE_COINGECKO_ENABLED) {
    try {
      const result = await fetchTokenPriceFromCoingecko();
      if (result.available && result.priceUsd) {
        return result;
      }
    } catch (error) {
      // Continue to next provider
    }
  }

  // 3. Try DexScreener (Fallback)
  if (TOKEN_PRICE_FALLBACK_ENABLED) {
    try {
      const result = await fetchTokenPriceFromDexscreener();
      if (result.available && result.priceUsd) {
        return result;
      }
    } catch (error) {
      // Continue
    }
  }

  throw new Error('Failed to fetch token price from all sources');
};

module.exports = {
  fetchTokenPrice,
  fetchTokenPriceFromEtherscan,
  fetchTokenPriceFromCoingecko,
  fetchTokenPriceFromDexscreener,
};
