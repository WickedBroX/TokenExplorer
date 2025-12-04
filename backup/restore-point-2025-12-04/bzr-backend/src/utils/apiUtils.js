let ETHERSCAN_API_KEYS = [];
let currentKeyIndex = 0;

const parseApiKeys = (raw) => {
  if (!raw) return [];
  const keys = (raw.includes(',')
    ? raw.split(',').map((value) => value.trim())
    : [raw]).filter((value) => value.length > 0);
  return keys;
};

const setApiKeys = (keys = []) => {
  if (!Array.isArray(keys)) {
    ETHERSCAN_API_KEYS = [];
    return;
  }
  const sanitized = keys.map((k) => k.trim()).filter(Boolean);
  ETHERSCAN_API_KEYS = sanitized;
  currentKeyIndex = 0;
};

// Initialize from environment so we have a usable default before config service loads DB values.
setApiKeys(parseApiKeys(process.env.ETHERSCAN_V2_API_KEY || ''));

const getNextApiKey = () => {
  if (!ETHERSCAN_API_KEYS.length) {
    return '';
  }

  const key = ETHERSCAN_API_KEYS[currentKeyIndex] || '';
  currentKeyIndex = (currentKeyIndex + 1) % ETHERSCAN_API_KEYS.length;
  return key;
};

const isProOnlyResponse = (payload = {}) => {
  const segments = [];
  if (typeof payload === 'string') {
    segments.push(payload);
  } else {
    if (payload?.message) segments.push(payload.message);
    if (payload?.result) segments.push(typeof payload.result === 'string' ? payload.result : JSON.stringify(payload.result));
  }

  const combined = segments.join(' ').toLowerCase();
  return combined.includes('pro') && (combined.includes('endpoint') || combined.includes('plan'));
};

module.exports = {
  getNextApiKey,
  isProOnlyResponse,
  ETHERSCAN_API_KEYS,
  setApiKeys,
  parseApiKeys,
};
