'use strict';

const { verifySessionToken } = require('../services/adminAuthService');

const requireAdminAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const tokenFromHeader = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = req.cookies?.admin_token || tokenFromHeader;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const payload = verifySessionToken(token);
    req.admin = { id: payload.sub, username: payload.username };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
};

module.exports = {
  requireAdminAuth,
};
