let ETHERSCAN_API_KEYS = [];
let currentKeyIndex = 0;
const KEY_BACKOFF_UNTIL = new Map();
const DEFAULT_KEY_BACKOFF_MS = Number(process.env.ETHERSCAN_KEY_BACKOFF_MS || 60_000);

const parseApiKeys = (raw) => {
  if (!raw) return [];
  const keys = (raw.includes(',')
    ? raw.split(',').map((value) => value.trim())
    : [raw]).filter((value) => value.length > 0);
  return keys;
};

const resetBackoff = () => {
  KEY_BACKOFF_UNTIL.clear();
};

const setApiKeys = (keys = []) => {
  if (!Array.isArray(keys)) {
    ETHERSCAN_API_KEYS = [];
    resetBackoff();
    return;
  }
  const sanitized = keys.map((k) => k.trim()).filter(Boolean);
  ETHERSCAN_API_KEYS = sanitized;
  currentKeyIndex = 0;
  resetBackoff();
};

// Initialize from environment so we have a usable default before config service loads DB values.
setApiKeys(parseApiKeys(process.env.ETHERSCAN_V2_API_KEY || ''));

const hasApiKeys = () => ETHERSCAN_API_KEYS.length > 0;

const isKeyBackedOff = (key) => {
  const until = KEY_BACKOFF_UNTIL.get(key);
  if (!until) return false;
  if (until < Date.now()) {
    KEY_BACKOFF_UNTIL.delete(key);
    return false;
  }
  return true;
};

const getNextApiKey = () => {
  if (!ETHERSCAN_API_KEYS.length) {
    return '';
  }

  const startIndex = currentKeyIndex;
  let attempts = 0;

  while (attempts < ETHERSCAN_API_KEYS.length) {
    const key = ETHERSCAN_API_KEYS[currentKeyIndex] || '';
    currentKeyIndex = (currentKeyIndex + 1) % ETHERSCAN_API_KEYS.length;
    attempts += 1;

    if (!isKeyBackedOff(key)) {
      return key;
    }
  }

  // All keys are backed off
  return '';
};

const markApiKeyAsFailed = (key, { reason = 'rate_limit', backoffMs = DEFAULT_KEY_BACKOFF_MS } = {}) => {
  if (!key) return;
  const duration = Number.isFinite(backoffMs) && backoffMs > 0 ? backoffMs : DEFAULT_KEY_BACKOFF_MS;
  KEY_BACKOFF_UNTIL.set(key, Date.now() + duration);
  console.warn(`! Backing off Etherscan key (${reason}) for ${duration}ms`);
};

const isRateLimitLike = (payload = {}) => {
  const segments = [];
  if (payload?.status) segments.push(String(payload.status));
  if (payload?.message) segments.push(payload.message);
  if (payload?.result) segments.push(typeof payload.result === 'string' ? payload.result : JSON.stringify(payload.result));
  if (typeof payload === 'string') segments.push(payload);

  const combined = segments.join(' ').toLowerCase();
  return (
    combined.includes('rate limit') ||
    combined.includes('max rate') ||
    combined.includes('too many request') ||
    combined.includes('busy') ||
    combined.includes('limit reached')
  );
};

const shouldBackoffApiKey = (error) => {
  if (!error) return false;
  if (error.response?.status === 429) return true;

  const payload = error.response?.data || error.payload || error.upstreamResponse;
  return isRateLimitLike(payload) || isRateLimitLike(error.message || '');
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

const respondUpstreamFailure = (res, message, details = {}) => {
  return res.status(502).json({
    message,
    upstream: details,
  });
};

module.exports = {
  getNextApiKey,
  hasApiKeys,
  isProOnlyResponse,
  ETHERSCAN_API_KEYS,
  setApiKeys,
  parseApiKeys,
  markApiKeyAsFailed,
  shouldBackoffApiKey,
  respondUpstreamFailure,
};
