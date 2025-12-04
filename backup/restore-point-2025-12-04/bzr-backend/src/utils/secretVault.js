'use strict';

const crypto = require('crypto');

const getMasterKey = () => {
  const secret = process.env.ADMIN_CRYPTO_SECRET || process.env.ADMIN_JWT_SECRET || '';
  if (!secret) {
    throw new Error('Missing ADMIN_CRYPTO_SECRET (fallback ADMIN_JWT_SECRET) for encrypting secrets');
  }

  // Derive a 32-byte key from the provided secret
  return crypto.createHash('sha256').update(secret).digest();
};

const encryptSecret = (plainText) => {
  if (typeof plainText !== 'string') {
    throw new Error('Secret to encrypt must be a string');
  }

  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

const decryptSecret = (cipherText) => {
  if (!cipherText) {
    return '';
  }
  const key = getMasterKey();
  const buffer = Buffer.from(cipherText, 'base64');
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

module.exports = {
  encryptSecret,
  decryptSecret,
};
