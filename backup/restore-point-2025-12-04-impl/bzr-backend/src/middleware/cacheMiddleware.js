const { apiCache } = require('../utils/cache');

const cacheMiddleware = (duration) => (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  const key = req.originalUrl || req.url;
  const cachedResponse = apiCache.get(key);

  if (cachedResponse) {
    return res.send(cachedResponse);
  } else {
    res.sendResponse = res.send;
    res.send = (body) => {
      apiCache.set(key, body, duration);
      res.sendResponse(body);
    };
    next();
  }
};

module.exports = cacheMiddleware;
