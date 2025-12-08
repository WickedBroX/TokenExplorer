import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_APP_CONFIG } from "../constants/index";
import { resolveSocialIconKey, type SocialIconKey } from "../utils/social";

export type SocialLink = { name: string; url: string; icon?: SocialIconKey };
export type FooterMenuLink = { label: string; url: string };
export type FooterMenu = { title: string; links: FooterMenuLink[] };

export type AppConfig = {
  tokenAddress: string;
  logoUrl: string;
  aboutText: string;
  copyrightText: string;
  infoLinks: SocialLink[];
  footerSocialLinks: SocialLink[];
  footerMenus: FooterMenu[];
};

type ConfigContextValue = {
  config: AppConfig;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const ConfigContext = createContext<ConfigContextValue>({
  config: {
    ...DEFAULT_APP_CONFIG,
    infoLinks: [...DEFAULT_APP_CONFIG.infoLinks],
    footerSocialLinks: [...DEFAULT_APP_CONFIG.footerSocialLinks],
    footerMenus: [...DEFAULT_APP_CONFIG.footerMenus],
  },
  loading: false,
  error: null,
  refresh: async () => {},
});

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const normalizeSocialLinks = (links: SocialLink[]) =>
    Array.isArray(links)
      ? links.map((link) => ({
          ...link,
          icon: resolveSocialIconKey(link),
        }))
      : [];

  const [config, setConfig] = useState<AppConfig>({
    ...DEFAULT_APP_CONFIG,
    infoLinks: normalizeSocialLinks(DEFAULT_APP_CONFIG.infoLinks),
    footerSocialLinks: normalizeSocialLinks(DEFAULT_APP_CONFIG.footerSocialLinks),
    footerMenus: [...DEFAULT_APP_CONFIG.footerMenus],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/config");
      if (!response.ok) {
        throw new Error(`Failed to load config (${response.status})`);
      }
      const payload = await response.json();
      if (payload?.settings) {
        setConfig({
          tokenAddress: payload.settings.tokenAddress || DEFAULT_APP_CONFIG.tokenAddress,
          logoUrl: payload.settings.logoUrl || DEFAULT_APP_CONFIG.logoUrl,
          aboutText: payload.settings.aboutText || DEFAULT_APP_CONFIG.aboutText,
          copyrightText: payload.settings.copyrightText || DEFAULT_APP_CONFIG.copyrightText,
          infoLinks: Array.isArray(payload.settings.infoLinks)
            ? normalizeSocialLinks(payload.settings.infoLinks)
            : normalizeSocialLinks(DEFAULT_APP_CONFIG.infoLinks),
          footerSocialLinks: Array.isArray(payload.settings.footerSocialLinks)
            ? normalizeSocialLinks(payload.settings.footerSocialLinks)
            : normalizeSocialLinks(DEFAULT_APP_CONFIG.footerSocialLinks),
          footerMenus: Array.isArray(payload.settings.footerMenus)
            ? [...payload.settings.footerMenus]
            : [...DEFAULT_APP_CONFIG.footerMenus],
        });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load config");
      setConfig({
        ...DEFAULT_APP_CONFIG,
        infoLinks: normalizeSocialLinks(DEFAULT_APP_CONFIG.infoLinks),
        footerSocialLinks: normalizeSocialLinks(DEFAULT_APP_CONFIG.footerSocialLinks),
        footerMenus: [...DEFAULT_APP_CONFIG.footerMenus],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const value = useMemo(
    () => ({
      config,
      loading,
      error,
      refresh: loadConfig,
    }),
    [config, loading, error]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export const useAppConfig = () => useContext(ConfigContext);
