'use strict';

const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { verifyPassword, signSessionToken, ensureDefaultAdmin } = require('../services/adminAuthService');
const { getPublicSettings, updateSiteSettings, listApiCredentials, upsertApiCredential, getProviderApiKeys, deleteApiCredential, deleteSingleApiKey } = require('../services/configService');
const { requireDatabaseUrl } = require('../utils/dbUrl');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 * 200 } }); // 200MB cap

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
  maxAge: 12 * 60 * 60 * 1000, // 12h
};

const login = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const user = await verifyPassword(username, password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signSessionToken(user);
  res.cookie('admin_token', token, COOKIE_OPTIONS);
  return res.json({ ok: true, username: user.username });
};

const logout = async (_req, res) => {
  res.clearCookie('admin_token', { httpOnly: true, sameSite: 'lax', secure: true });
  return res.json({ ok: true });
};

const getSettings = async (_req, res) => {
  return res.json(getPublicSettings());
};

const updateSettingsController = async (req, res) => {
  const {
    logoUrl,
    aboutText,
    copyrightText,
    tokenAddress,
    socialLinks,
    infoLinks,
    footerSocialLinks,
    footerMenus,
  } = req.body || {};
  try {
    const settings = await updateSiteSettings({
      logoUrl,
      aboutText,
      copyrightText,
      tokenAddress,
      socialLinks,
      infoLinks,
      footerSocialLinks,
      footerMenus,
    });
    return res.json(settings);
  } catch (error) {
    console.error('X Failed to update settings', error);
    return res.status(500).json({ message: 'Failed to update settings' });
  }
};

const listApiKeys = async (_req, res) => {
  try {
    const items = await listApiCredentials();
    return res.json({ items });
  } catch (error) {
    console.error('X Failed to list API keys', error);
    return res.status(500).json({ message: 'Failed to list API keys' });
  }
};

const updateApiKey = async (req, res) => {
  const provider = req.params.provider;
  const { value } = req.body || {};
  if (!value) {
    return res.status(400).json({ message: 'value is required' });
  }

  try {
    await upsertApiCredential(provider, value);
    return res.json({ ok: true });
  } catch (error) {
    console.error('X Failed to update API key', error);
    return res.status(500).json({ message: 'Failed to update API key' });
  }
};

const removeApiKey = async (req, res) => {
  const provider = req.params.provider;
  const index = req.query.index;
  try {
    if (index !== undefined) {
      await deleteSingleApiKey(provider, Number(index));
    } else {
      await deleteApiCredential(provider);
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error('X Failed to delete API key', error);
    return res.status(500).json({ message: 'Failed to delete API key' });
  }
};

const getBackupStream = (connectionString) => {
  return spawn('pg_dump', [connectionString]);
};

const backup = async (_req, res) => {
  const connectionString = requireDatabaseUrl();
  if (!connectionString) {
    return res.status(400).json({ message: 'Database not configured for backup' });
  }

  const pgDump = getBackupStream(connectionString);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="bzr-backup.sql"');

  pgDump.stdout.pipe(res);
  pgDump.stderr.on('data', (data) => console.error('[pg_dump]', data.toString()));

  pgDump.on('error', (err) => {
    console.error('X pg_dump failed', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'pg_dump failed' });
    }
  });
};

const restore = [
  upload.single('backup'),
  async (req, res) => {
    const connectionString = requireDatabaseUrl();
    if (!connectionString) {
      return res.status(400).json({ message: 'Database not configured for restore' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'backup file is required' });
    }

    // Write to a temp file to avoid holding in memory during psql
    const tempPath = path.join('/tmp', `bzr-restore-${Date.now()}.sql`);
    fs.writeFileSync(tempPath, req.file.buffer);

    const env = { ...process.env };
    const url = new URL(connectionString);
    if (url.password) {
      env.PGPASSWORD = url.password;
    }

    const args = [];
    if (url.username) args.push('-U', url.username);
    if (url.hostname) args.push('-h', url.hostname);
    if (url.port) args.push('-p', String(url.port));
    if (url.pathname) args.push('-d', url.pathname.slice(1));
    args.push('-f', tempPath);

    const psql = spawn('psql', args, { env });

    psql.stderr.on('data', (data) => console.error('[psql]', data.toString()));

    psql.on('close', (code) => {
      fs.unlink(tempPath, () => {});
      if (code === 0) {
        return res.json({ ok: true });
      }
      return res.status(500).json({ message: `psql exited with code ${code}` });
    });
  },
];

const publicConfig = async (_req, res) => {
  return res.json({
    settings: getPublicSettings(),
    apiKeys: {
      etherscanConfigured: Boolean(getProviderApiKeys().etherscan?.length),
      cronosConfigured: Boolean(getProviderApiKeys().cronos),
    },
  });
};

const bootstrapAdmin = async () => {
  try {
    await ensureDefaultAdmin();
  } catch (error) {
    console.warn('! Failed to bootstrap default admin user', error.message || error);
  }
};

module.exports = {
  login,
  logout,
  getSettings,
  updateSettingsController,
  listApiKeys,
  updateApiKey,
  removeApiKey,
  backup,
  restore,
  publicConfig,
  bootstrapAdmin,
};
