const { getNextApiKey } = require('../utils/apiUtils');

const CHAINS = [
  { id: 1, name: 'Ethereum', provider: 'etherscan' },
  { id: 10, name: 'Optimism', provider: 'etherscan' },
  { id: 56, name: 'BSC', provider: 'etherscan' },
  { id: 137, name: 'Polygon', provider: 'etherscan' },
  { id: 324, name: 'zkSync', provider: 'etherscan' },
  { id: 5000, name: 'Mantle', provider: 'etherscan' },
  { id: 42161, name: 'Arbitrum', provider: 'etherscan' },
  { id: 43114, name: 'Avalanche', provider: 'etherscan' },
  { id: 8453, name: 'Base', provider: 'etherscan' },
  { id: 25, name: 'Cronos', provider: 'cronos' },
];

const DEFAULT_PROVIDER_KEY = 'etherscan';

const API_V2_BASE_URL = 'https://api.etherscan.io/v2/api';
const CRONOS_API_BASE_URL = process.env.CRONOS_API_BASE_URL || 'https://explorer-api.cronos.org/mainnet/api/v2';

// Note: Etherscan API key is handled dynamically in the application for load balancing.
// We provide the base configuration here.
const PROVIDERS = {
  etherscan: {
    baseUrl: API_V2_BASE_URL,
    requiresChainId: true,
    // apiKey will be injected or rotated by the consumer
  },
  cronos: {
    baseUrl: CRONOS_API_BASE_URL,
    requiresChainId: false,
    apiKey: process.env.CRONOS_API_KEY,
  },
};

const getChainDefinition = (chainId) => CHAINS.find((chain) => chain.id === chainId);

const getProviderKeyForChain = (chain) => (chain?.provider ? String(chain.provider) : DEFAULT_PROVIDER_KEY);

const getProviderConfigForChain = (chain, { requireApiKey = true } = {}) => {
  const providerKey = getProviderKeyForChain(chain);
  const provider = PROVIDERS[providerKey];

  if (!provider) {
    throw new Error(`Provider configuration missing for chain ${chain?.name || chain?.id} (${providerKey})`);
  }

  // Note: Etherscan keys are handled dynamically, so we don't check provider.apiKey here for etherscan
  if (requireApiKey && !provider.apiKey && providerKey !== 'etherscan') {
    throw new Error(`Missing API key for provider "${providerKey}" (chain ${chain?.name || chain?.id})`);
  }

  return { ...provider, key: providerKey };
};

const buildProviderRequest = (chain, params = {}, options = {}) => {
  const { includeApiKey = true } = options;
  const provider = getProviderConfigForChain(chain, { requireApiKey: includeApiKey });
  const nextParams = { ...params };

  if (includeApiKey) {
    if (provider.key === 'etherscan') {
      nextParams.apikey = getNextApiKey();
    } else {
      nextParams.apikey = provider.apiKey;
    }
  }

  if (provider.requiresChainId) {
    nextParams.chainid = chain.id;
  }
  
  return { provider, params: nextParams };
};

module.exports = {
  CHAINS,
  PROVIDERS,
  DEFAULT_PROVIDER_KEY,
  TRANSFERS_DEFAULT_CHAIN_ID: 1,
  getChainDefinition,
  getProviderKeyForChain,
  getProviderConfigForChain,
  buildProviderRequest,
};
