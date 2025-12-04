-- Separate editable link groups for info card, footer social links, and footer menus
BEGIN;

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS info_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_social_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_menus JSONB DEFAULT '[]'::jsonb;

-- Backfill existing row with previous social_links for both info/footer, and seed footer menus
UPDATE site_settings
SET
  info_links = CASE
    WHEN info_links IS NULL OR jsonb_array_length(info_links) = 0 THEN COALESCE(social_links, '[]'::jsonb)
    ELSE info_links
  END,
  footer_social_links = CASE
    WHEN footer_social_links IS NULL OR jsonb_array_length(footer_social_links) = 0 THEN COALESCE(social_links, '[]'::jsonb)
    ELSE footer_social_links
  END,
  footer_menus = CASE
    WHEN footer_menus IS NULL OR jsonb_typeof(footer_menus) IS DISTINCT FROM 'array' THEN
      '[
        {
          "title": "Markets & Data",
          "links": [
            { "label": "CoinMarketCap", "url": "https://coinmarketcap.com/currencies/bazaars/" },
            { "label": "Coingecko", "url": "https://www.coingecko.com/en/coins/bazaars" },
            { "label": "Etherscan", "url": "https://etherscan.io/token/0x8d96b4ab6c741a4c8679ae323a100d74f085ba8f" }
          ]
        },
        {
          "title": "Exchanges",
          "links": [
            { "label": "Bitmart", "url": "https://www.bitmart.com/trade/en-US?symbol=BZR_USDT" },
            { "label": "Coinstore", "url": "https://www.coinstore.com/#/spot/bzrusdt" },
            { "label": "MEXC", "url": "https://www.mexc.com/exchange/BZR_USDT" }
          ]
        },
        {
          "title": "Community",
          "links": [
            { "label": "Website", "url": "https://bazaars.app" },
            { "label": "Twitter", "url": "https://twitter.com/BazaarsBzr" },
            { "label": "Telegram", "url": "https://t.me/Bazaarsapp" },
            { "label": "Discord", "url": "https://discord.com/invite/bazaars-bzr-979586323688087552" },
            { "label": "Medium", "url": "https://medium.com/@BazaarsBzr" }
          ]
        }
      ]'::jsonb
    ELSE footer_menus
  END,
  updated_at = NOW()
WHERE id = 1;

COMMIT;
