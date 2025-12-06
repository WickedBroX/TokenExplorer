'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../utils/db');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.ADMIN_CRYPTO_SECRET || 'change-me';
const ADMIN_JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '12h';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

const getAdminByUsername = async (username) => {
  const result = await query('SELECT id, username, password_hash FROM admin_users WHERE username = $1 LIMIT 1', [username]);
  return result.rows?.[0] || null;
};

const ensureDefaultAdmin = async () => {
  const passwordHashFromEnv = process.env.ADMIN_PASSWORD_HASH;
  const plainPassword = process.env.ADMIN_PASSWORD;

  if (!passwordHashFromEnv && !plainPassword) {
    console.warn('! ADMIN_PASSWORD or ADMIN_PASSWORD_HASH not provided; admin user will not be bootstrapped');
    return null;
  }

  const passwordHash = passwordHashFromEnv && passwordHashFromEnv.startsWith('$2')
    ? passwordHashFromEnv
    : await bcrypt.hash(plainPassword, 10);

  const result = await query(
    `
    INSERT INTO admin_users (username, password_hash)
    VALUES ($1, $2)
    ON CONFLICT (username)
    DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW()
    RETURNING id, username
    `,
    [ADMIN_USERNAME, passwordHash]
  );

  return result.rows?.[0] || null;
};

const verifyPassword = async (username, password) => {
  const user = await getAdminByUsername(username);
  if (!user) {
    return null;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  return match ? user : null;
};

const signSessionToken = (user) => {
  const payload = { sub: user.id, username: user.username };
  return jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: ADMIN_JWT_EXPIRES_IN });
};

const verifySessionToken = (token) => {
  return jwt.verify(token, ADMIN_JWT_SECRET);
};

module.exports = {
  getAdminByUsername,
  ensureDefaultAdmin,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
};
