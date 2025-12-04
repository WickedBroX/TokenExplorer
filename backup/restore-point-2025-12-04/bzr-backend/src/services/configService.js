'use strict';

const { query } = require('../utils/db');
const { encryptSecret, decryptSecret } = require('../utils/secretVault');
const { PROVIDERS } = require('../config/chains');
const { parseApiKeys, setApiKeys } = require('../utils/apiUtils');

const DEFAULT_SOCIAL_LINKS = [
  { name: 'Website', url: 'https://bazaars.app' },
  { name: 'X', url: 'https://x.com/BazaarsBzr' },
  { name: 'Telegram', url: 'https://t.me/Bazaarsapp' },
  { name: 'Discord', url: 'https://discord.com/invite/bazaars-bzr-979586323688087552' },
  { name: 'Medium', url: 'https://medium.com/@BazaarsBzr' },
  { name: 'Facebook', url: 'https://www.facebook.com/Bazaarsapp/' },
  { name: 'Instagram', url: 'https://www.instagram.com/bazaars.app/' },
  { name: 'Whitepaper', url: 'https://github.com/BazaarsBZR/Whitepaper/blob/main/Bazaars.pdf' },
];

const normalizeUrlToX = (url) => {
  if (typeof url !== 'string') return url;
  return url.replace(/https?:\/\/(www\.)?twitter\.com/gi, 'https://x.com');
};

const normalizeSocialEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return entry;
  const normalized = { ...entry };
  if (typeof normalized.url === 'string') {
    normalized.url = normalizeUrlToX(normalized.url);
  }
  if (typeof normalized.name === 'string' && normalized.name.toLowerCase() === 'twitter') {
    normalized.name = 'X';
  }
  if (typeof normalized.label === 'string' && normalized.label.toLowerCase() === 'twitter') {
    normalized.label = 'X';
  }
  return normalized;
};

const normalizeSocialLinks = (links) =>
  Array.isArray(links) ? links.map((link) => normalizeSocialEntry(link)) : [];

const normalizeFooterMenus = (menus) =>
  Array.isArray(menus)
    ? menus.map((menu) => ({
        ...menu,
        links: Array.isArray(menu?.links) ? menu.links.map((link) => normalizeSocialEntry(link)) : [],
      }))
    : [];

const normalizeSettings = (settings) => ({
  ...settings,
  infoLinks: normalizeSocialLinks(settings.infoLinks || []),
  footerSocialLinks: normalizeSocialLinks(settings.footerSocialLinks || []),
  footerMenus: normalizeFooterMenus(settings.footerMenus || []),
});

const defaultSettings = {
  tokenAddress: process.env.BZR_TOKEN_ADDRESS || '',
  logoUrl: 'https://res.cloudinary.com/dhznjbcys/image/upload/v1762175462/BZR-SCAN-V2_iybuqz.png',
  aboutText: 'Explore and track BZR token transactions across multiple blockchain networks.',
  copyrightText: '© 2025 Bazaars. All rights reserved.',
  infoLinks: DEFAULT_SOCIAL_LINKS,
  footerSocialLinks: DEFAULT_SOCIAL_LINKS,
  footerMenus: [
    {
      title: 'Markets & Data',
      links: [
        { label: 'CoinMarketCap', url: 'https://coinmarketcap.com/currencies/bazaars/' },
        { label: 'Coingecko', url: 'https://www.coingecko.com/en/coins/bazaars' },
        { label: 'Etherscan', url: 'https://etherscan.io/token/0x8d96b4ab6c741a4c8679ae323a100d74f085ba8f' },
      ],
    },
    {
      title: 'Exchanges',
      links: [
        { label: 'Bitmart', url: 'https://www.bitmart.com/trade/en-US?symbol=BZR_USDT' },
        { label: 'Coinstore', url: 'https://www.coinstore.com/#/spot/bzrusdt' },
        { label: 'MEXC', url: 'https://www.mexc.com/exchange/BZR_USDT' },
      ],
    },
    {
      title: 'Community',
      links: [
        { label: 'Website', url: 'https://bazaars.app' },
        { label: 'X', url: 'https://x.com/BazaarsBzr' },
        { label: 'Telegram', url: 'https://t.me/Bazaarsapp' },
        { label: 'Discord', url: 'https://discord.com/invite/bazaars-bzr-979586323688087552' },
        { label: 'Medium', url: 'https://medium.com/@BazaarsBzr' },
      ],
    },
  ],
};

let runtimeSettings = normalizeSettings({ ...defaultSettings });
let runtimeApiKeys = {
  etherscan: parseApiKeys(process.env.ETHERSCAN_V2_API_KEY || ''),
  cronos: process.env.CRONOS_API_KEY || '',
};

const applyRuntimeApiKeys = () => {
  setApiKeys(runtimeApiKeys.etherscan || []);
  // Mutate provider config so consumers pick up the latest values
  PROVIDERS.cronos.apiKey = runtimeApiKeys.cronos || '';
};

const bootstrapConfig = async () => {
  await Promise.all([loadSettingsFromDb(), loadApiCredentialsFromDb()]);
};

const loadSettingsFromDb = async () => {
  try {
    const result = await query('SELECT logo_url, about_text, copyright_text, token_address, social_links, info_links, footer_social_links, footer_menus FROM site_settings WHERE id = 1');
    if (result?.rows?.length) {
      const row = result.rows[0];
      const infoLinks = Array.isArray(row.info_links)
        ? row.info_links
        : (Array.isArray(row.social_links) ? row.social_links : runtimeSettings.infoLinks);
      const footerSocialLinks = Array.isArray(row.footer_social_links)
        ? row.footer_social_links
        : (Array.isArray(row.social_links) ? row.social_links : runtimeSettings.footerSocialLinks);
      const footerMenus = Array.isArray(row.footer_menus)
        ? row.footer_menus
        : runtimeSettings.footerMenus;

      runtimeSettings = normalizeSettings({
        tokenAddress: row.token_address || runtimeSettings.tokenAddress,
        logoUrl: row.logo_url || runtimeSettings.logoUrl,
        aboutText: row.about_text || runtimeSettings.aboutText,
        copyrightText: row.copyright_text || runtimeSettings.copyrightText,
        infoLinks,
        footerSocialLinks,
        footerMenus,
      });
    }
  } catch (error) {
    console.warn('! Failed to load site settings from DB; using defaults.', error.message || error);
  }
};

const loadApiCredentialsFromDb = async () => {
  try {
    const result = await query('SELECT provider, value_encrypted FROM api_credentials');
    if (result?.rows) {
      for (const row of result.rows) {
        const provider = row.provider;
        const value = decryptSecret(row.value_encrypted);
        if (provider === 'etherscan') {
          runtimeApiKeys.etherscan = parseApiKeys(value);
        } else if (provider === 'cronos') {
          runtimeApiKeys.cronos = value;
        }
      }
      applyRuntimeApiKeys();
    }
  } catch (error) {
    console.warn('! Failed to load API credentials from DB; using environment defaults.', error.message || error);
    applyRuntimeApiKeys();
  }
};

const getPublicSettings = () =>
  normalizeSettings({
    logoUrl: runtimeSettings.logoUrl,
    aboutText: runtimeSettings.aboutText,
    copyrightText: runtimeSettings.copyrightText,
    tokenAddress: runtimeSettings.tokenAddress,
    infoLinks: runtimeSettings.infoLinks,
    footerSocialLinks: runtimeSettings.footerSocialLinks,
    footerMenus: runtimeSettings.footerMenus,
  });

const getTokenAddress = () => runtimeSettings.tokenAddress;

const updateSiteSettings = async ({ logoUrl, aboutText, copyrightText, tokenAddress, socialLinks, infoLinks, footerSocialLinks, footerMenus }) => {
  const nextSettings = {
    logo_url: logoUrl ?? runtimeSettings.logoUrl,
    about_text: aboutText ?? runtimeSettings.aboutText,
    copyright_text: copyrightText ?? runtimeSettings.copyrightText,
    token_address: tokenAddress ?? runtimeSettings.tokenAddress,
    info_links: Array.isArray(infoLinks) ? infoLinks : (Array.isArray(socialLinks) ? socialLinks : runtimeSettings.infoLinks),
    footer_social_links: Array.isArray(footerSocialLinks) ? footerSocialLinks : runtimeSettings.footerSocialLinks,
    footer_menus: Array.isArray(footerMenus) ? footerMenus : runtimeSettings.footerMenus,
  };

  const normalizedInfoLinks = normalizeSocialLinks(nextSettings.info_links);
  const normalizedFooterSocialLinks = normalizeSocialLinks(nextSettings.footer_social_links);
  const normalizedFooterMenus = normalizeFooterMenus(nextSettings.footer_menus);

  await query(
    `
    INSERT INTO site_settings (id, logo_url, about_text, copyright_text, token_address, social_links, info_links, footer_social_links, footer_menus, updated_at)
    VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT (id)
    DO UPDATE SET
      logo_url = EXCLUDED.logo_url,
      about_text = EXCLUDED.about_text,
      copyright_text = EXCLUDED.copyright_text,
      token_address = EXCLUDED.token_address,
      social_links = EXCLUDED.social_links,
      info_links = EXCLUDED.info_links,
      footer_social_links = EXCLUDED.footer_social_links,
      footer_menus = EXCLUDED.footer_menus,
      updated_at = NOW()
    `,
    [
      nextSettings.logo_url,
      nextSettings.about_text,
      nextSettings.copyright_text,
      nextSettings.token_address,
      JSON.stringify(normalizedInfoLinks),
      JSON.stringify(normalizedInfoLinks),
      JSON.stringify(normalizedFooterSocialLinks),
      JSON.stringify(normalizedFooterMenus),
    ]
  );

  runtimeSettings = normalizeSettings({
    tokenAddress: nextSettings.token_address,
    logoUrl: nextSettings.logo_url,
    aboutText: nextSettings.about_text,
    copyrightText: nextSettings.copyright_text,
    infoLinks: normalizedInfoLinks,
    footerSocialLinks: normalizedFooterSocialLinks,
    footerMenus: normalizedFooterMenus,
  });
  return getPublicSettings();
};

const upsertApiCredential = async (provider, value) => {
  if (!provider || typeof value !== 'string') {
    throw new Error('Provider and value are required for API credential update');
  }
  const encrypted = encryptSecret(value);
  await query(
    `
    INSERT INTO api_credentials (provider, value_encrypted, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (provider)
    DO UPDATE SET value_encrypted = EXCLUDED.value_encrypted, updated_at = NOW()
    `,
    [provider, encrypted]
  );

  if (provider === 'etherscan') {
    runtimeApiKeys.etherscan = parseApiKeys(value);
  } else if (provider === 'cronos') {
    runtimeApiKeys.cronos = value;
  }
  applyRuntimeApiKeys();
};

const listApiCredentials = async () => {
  const rows = await query('SELECT provider, value_encrypted, updated_at FROM api_credentials ORDER BY provider ASC');
  const formatted = (rows?.rows || []).map((row) => {
    const decrypted = decryptSecret(row.value_encrypted || '');
    const keys = typeof decrypted === 'string' && decrypted.length
      ? decrypted.split(',').map((k) => k.trim()).filter(Boolean)
      : [];
    return {
      provider: row.provider,
      updatedAt: row.updated_at,
      keys,
      count: keys.length,
    };
  });

  // Include env-based providers that might not yet exist in DB
  if (runtimeApiKeys.etherscan?.length && !formatted.find((m) => m.provider === 'etherscan')) {
    formatted.push({ provider: 'etherscan', updatedAt: null, keys: runtimeApiKeys.etherscan, count: runtimeApiKeys.etherscan.length });
  }
  if (runtimeApiKeys.cronos && !formatted.find((m) => m.provider === 'cronos')) {
    formatted.push({ provider: 'cronos', updatedAt: null, keys: [runtimeApiKeys.cronos], count: 1 });
  }
  return formatted;
};

const getProviderApiKeys = () => ({
  etherscan: runtimeApiKeys.etherscan,
  cronos: runtimeApiKeys.cronos,
});

const deleteApiCredential = async (provider) => {
  await query('DELETE FROM api_credentials WHERE provider = $1', [provider]);
  if (provider === 'etherscan') {
    runtimeApiKeys.etherscan = [];
  } else if (provider === 'cronos') {
    runtimeApiKeys.cronos = '';
  }
  applyRuntimeApiKeys();
};

const deleteSingleApiKey = async (provider, index) => {
  const rows = await query('SELECT value_encrypted FROM api_credentials WHERE provider = $1 LIMIT 1', [provider]);
  const current = rows?.rows?.[0];
  if (!current) {
    return;
  }
  const decrypted = decryptSecret(current.value_encrypted || '');
  let keys = typeof decrypted === 'string' && decrypted.length
    ? decrypted.split(',').map((k) => k.trim()).filter(Boolean)
    : [];
  if (!Array.isArray(keys) || !keys.length) return;
  const idx = Number(index);
  if (Number.isInteger(idx) && idx >= 0 && idx < keys.length) {
    keys.splice(idx, 1);
  }
  const joined = keys.join(',');
  if (keys.length === 0) {
    await deleteApiCredential(provider);
    return;
  }
  await upsertApiCredential(provider, joined);
};

module.exports = {
  bootstrapConfig,
  getPublicSettings,
  getTokenAddress,
  updateSiteSettings,
  upsertApiCredential,
  listApiCredentials,
  getProviderApiKeys,
  loadApiCredentialsFromDb,
  loadSettingsFromDb,
  deleteApiCredential,
  deleteSingleApiKey,
};
