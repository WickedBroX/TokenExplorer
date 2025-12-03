const API_KEYS_RAW = process.env.ETHERSCAN_V2_API_KEY || '';
const ETHERSCAN_API_KEYS = (() => {
  const keys = (API_KEYS_RAW.includes(',')
    ? API_KEYS_RAW.split(',').map((value) => value.trim())
    : [API_KEYS_RAW]).filter((value) => value.length > 0);
  return keys.length > 0 ? keys : [''];
})();

let currentKeyIndex = 0;

const getNextApiKey = () => {
  if (ETHERSCAN_API_KEYS.length === 0) {
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
  ETHERSCAN_API_KEYS
};
