import React, { useEffect, useState } from "react";
import {
  Lock,
  LogOut,
  Save,
  Upload,
  Download,
  Link2,
  KeyRound,
  Image as ImageIcon,
  Info,
  Globe,
  FileText,
  Send,
} from "lucide-react";
import { useAppConfig } from "../context/ConfigContext";
import { DEFAULT_APP_CONFIG } from "../constants/index";
import { resolveSocialIconKey, SOCIAL_ICON_OPTIONS, type SocialIconKey } from "../utils/social";
import XLogoIcon from "../components/icons/XLogoIcon";
const isChecksumAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

type SettingsPayload = {
  logoUrl: string;
  aboutText: string;
  copyrightText: string;
  tokenAddress: string;
  infoLinks: { name: string; url: string; icon?: SocialIconKey }[];
  footerSocialLinks: { name: string; url: string; icon?: SocialIconKey }[];
  footerMenus: { title: string; links: { label: string; url: string }[] }[];
};

type ApiKeysState = {
  etherscan?: string;
  cronos?: string;
};

type ApiKeysDisplay = {
  provider: string;
  keys: string[];
  count: number;
  updatedAt?: string;
  healthy?: boolean;
  message?: string;
};

const DiscordIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const MediumIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const SOCIAL_ICON_META: Record<SocialIconKey, { label: string; Icon: React.ComponentType<{ className?: string }>; bg: string }> = {
  website: { label: "Website / Link", Icon: Globe, bg: "bg-blue-500" },
  whitepaper: { label: "Whitepaper / Docs", Icon: FileText, bg: "bg-gray-600" },
  x: { label: "X (Twitter)", Icon: XLogoIcon, bg: "bg-black" },
  telegram: { label: "Telegram", Icon: Send, bg: "bg-blue-500" },
  discord: { label: "Discord", Icon: DiscordIcon, bg: "bg-indigo-600" },
  medium: { label: "Medium", Icon: MediumIcon, bg: "bg-gray-700" },
  facebook: { label: "Facebook", Icon: FacebookIcon, bg: "bg-blue-700" },
  instagram: { label: "Instagram", Icon: InstagramIcon, bg: "bg-pink-500" },
};

const SocialLinksEditor: React.FC<{
  links: { name: string; url: string; icon?: SocialIconKey }[];
  onChange: (links: { name: string; url: string; icon?: SocialIconKey }[]) => void;
  addLabel?: string;
  namePlaceholder?: string;
  urlPlaceholder?: string;
}> = ({ links, onChange, addLabel = "Add link", namePlaceholder = "Name (e.g., X)", urlPlaceholder = "https://" }) => {
  const [openIconIndex, setOpenIconIndex] = useState<number | null>(null);

  const updateLink = (index: number, key: "name" | "url" | "icon", value: string) => {
    const next = [...links];
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  };

  const addLink = () => onChange([...links, { name: "", url: "", icon: "website" }]);
  const removeLink = (index: number) => onChange(links.filter((_, i) => i !== index));
  const moveLink = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {links.map((link, index) => (
        <div
          key={index}
          className={`space-y-2 ${index > 0 ? "pt-4 border-t border-gray-100" : ""}`}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setOpenIconIndex(null);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder={namePlaceholder}
              value={link.name}
              onChange={(e) => updateLink(index, "name", e.target.value)}
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenIconIndex(openIconIndex === index ? null : index)}
                className="h-10 w-10 flex items-center justify-center border border-gray-200 rounded-lg bg-white hover:border-blue-300 focus:ring-2 focus:ring-blue-500"
                aria-label={`Select icon for ${link.name || "link"}`}
              >
                {(() => {
                  const key = resolveSocialIconKey(link);
                  const meta = SOCIAL_ICON_META[key];
                  const Icon = meta.Icon;
                  return (
                    <span className={`h-7 w-7 rounded-full flex items-center justify-center text-white ${meta.bg}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                  );
                })()}
              </button>
              {openIconIndex === index && (
                <div className="absolute z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg p-2 space-y-1">
                  {SOCIAL_ICON_OPTIONS.map((option) => {
                    const meta = SOCIAL_ICON_META[option.value];
                    const Icon = meta.Icon;
                    const isActive = resolveSocialIconKey(link) === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm hover:bg-gray-50 ${
                          isActive ? "bg-blue-50 border border-blue-100" : ""
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          updateLink(index, "icon", option.value);
                          setOpenIconIndex(null);
                        }}
                      >
                        <span className={`h-7 w-7 rounded-full flex items-center justify-center text-white ${meta.bg}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-medium text-gray-700">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder={urlPlaceholder}
              value={link.url}
              onChange={(e) => updateLink(index, "url", e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeLink(index)}
              className="px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs hover:bg-red-100"
            >
              Remove
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => moveLink(index, -1)}
                className="px-2 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100"
                aria-label="Move link up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveLink(index, 1)}
                className="px-2 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100"
                aria-label="Move link down"
              >
                ↓
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addLink}
        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
      >
        <Link2 className="w-4 h-4" /> {addLabel}
      </button>
    </div>
  );
};

const FooterMenusEditor: React.FC<{
  menus: { title: string; links: { label: string; url: string }[] }[];
  onChange: (menus: { title: string; links: { label: string; url: string }[] }[]) => void;
}> = ({ menus, onChange }) => {
  const updateMenuTitle = (index: number, value: string) => {
    const next = [...menus];
    next[index] = { ...next[index], title: value };
    onChange(next);
  };

  const updateMenuLink = (menuIndex: number, linkIndex: number, key: "label" | "url", value: string) => {
    const next = [...menus];
    const links = [...(next[menuIndex]?.links || [])];
    links[linkIndex] = { ...links[linkIndex], [key]: value };
    next[menuIndex] = { ...next[menuIndex], links };
    onChange(next);
  };

  const addMenu = () => onChange([...menus, { title: "New Section", links: [{ label: "", url: "" }] }]);
  const removeMenu = (index: number) => onChange(menus.filter((_, i) => i !== index));

  const addLink = (menuIndex: number) => {
    const next = [...menus];
    const links = [...(next[menuIndex]?.links || [])];
    links.push({ label: "", url: "" });
    next[menuIndex] = { ...next[menuIndex], links };
    onChange(next);
  };

  const removeLink = (menuIndex: number, linkIndex: number) => {
    const next = [...menus];
    const links = [...(next[menuIndex]?.links || [])].filter((_, i) => i !== linkIndex);
    next[menuIndex] = { ...next[menuIndex], links };
    onChange(next);
  };

  const moveMenu = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= menus.length) return;
    const next = [...menus];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  const moveLink = (menuIndex: number, linkIndex: number, direction: -1 | 1) => {
    const links = menus[menuIndex]?.links || [];
    const target = linkIndex + direction;
    if (target < 0 || target >= links.length) return;
    const next = [...menus];
    const newLinks = [...links];
    const [item] = newLinks.splice(linkIndex, 1);
    newLinks.splice(target, 0, item);
    next[menuIndex] = { ...next[menuIndex], links: newLinks };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {menus.map((menu, menuIndex) => (
        <div key={menuIndex} className="border border-gray-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2">
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold"
              value={menu.title}
              onChange={(e) => updateMenuTitle(menuIndex, e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeMenu(menuIndex)}
              className="px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs hover:bg-red-100"
            >
              Remove section
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => moveMenu(menuIndex, -1)}
                className="px-2 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100"
                aria-label="Move section up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveMenu(menuIndex, 1)}
                className="px-2 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100"
                aria-label="Move section down"
              >
                ↓
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {menu.links.map((link, linkIndex) => (
              <div key={`${menuIndex}-${linkIndex}`} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Link label (e.g., CoinMarketCap)"
                  value={link.label}
                  onChange={(e) => updateMenuLink(menuIndex, linkIndex, "label", e.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="https://"
                    value={link.url}
                    onChange={(e) => updateMenuLink(menuIndex, linkIndex, "url", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(menuIndex, linkIndex)}
                    className="px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs hover:bg-red-100"
                  >
                    Remove
                  </button>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveLink(menuIndex, linkIndex, -1)}
                      className="px-2 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100"
                      aria-label="Move link up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(menuIndex, linkIndex, 1)}
                      className="px-2 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100"
                      aria-label="Move link down"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addLink(menuIndex)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <Link2 className="w-4 h-4" /> Add link
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addMenu}
        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
      >
        <Link2 className="w-4 h-4" /> Add section
      </button>
    </div>
  );
};

export const AdminPage: React.FC = () => {
  const { config, refresh: refreshPublicConfig } = useAppConfig();
  const normalizeSocialLinks = (links: { name: string; url: string; icon?: SocialIconKey }[] | undefined) =>
    Array.isArray(links)
      ? links.map((link) => ({
          ...link,
          icon: resolveSocialIconKey(link),
        }))
      : [];
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [settings, setSettings] = useState<SettingsPayload>({
    logoUrl: config.logoUrl || DEFAULT_APP_CONFIG.logoUrl,
    aboutText: config.aboutText || DEFAULT_APP_CONFIG.aboutText,
    copyrightText: config.copyrightText || DEFAULT_APP_CONFIG.copyrightText,
    tokenAddress: config.tokenAddress || DEFAULT_APP_CONFIG.tokenAddress,
    infoLinks: normalizeSocialLinks(config.infoLinks || DEFAULT_APP_CONFIG.infoLinks),
    footerSocialLinks: normalizeSocialLinks(config.footerSocialLinks || DEFAULT_APP_CONFIG.footerSocialLinks),
    footerMenus: config.footerMenus || DEFAULT_APP_CONFIG.footerMenus,
  });
  const [apiKeys, setApiKeys] = useState<ApiKeysState>({});
  const [apiKeysDisplay, setApiKeysDisplay] = useState<ApiKeysDisplay[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, { ok: boolean; message?: string }>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginForm),
      credentials: "include",
    });
    if (res.ok) {
      setIsAuthed(true);
      setStatus("Logged in");
      await fetchSettings();
    } else {
      setStatus("Login failed");
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) {
        setIsAuthed(false);
        return;
      }
      const payload = await res.json();
      setSettings({
        logoUrl: payload.logoUrl || DEFAULT_APP_CONFIG.logoUrl,
        aboutText: payload.aboutText || DEFAULT_APP_CONFIG.aboutText,
        copyrightText: payload.copyrightText || DEFAULT_APP_CONFIG.copyrightText,
        tokenAddress: payload.tokenAddress || DEFAULT_APP_CONFIG.tokenAddress,
        infoLinks: normalizeSocialLinks(payload.infoLinks || DEFAULT_APP_CONFIG.infoLinks),
        footerSocialLinks: normalizeSocialLinks(payload.footerSocialLinks || DEFAULT_APP_CONFIG.footerSocialLinks),
        footerMenus: payload.footerMenus || DEFAULT_APP_CONFIG.footerMenus,
      });
      setIsAuthed(true);
    } catch (error) {
      setIsAuthed(false);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch("/api/admin/api-keys", { credentials: "include" });
      if (!res.ok) return;
      const payload = await res.json();
      if (payload?.items) {
        setApiKeysDisplay(payload.items);
      }
    } catch (error) {
      // ignore for now
    }
  };

  const testApiKey = async (provider: string) => {
    setStatus(`Testing ${provider} key...`);
    try {
      const res = await fetch(`/api/admin/api-keys/${provider}/health`, { credentials: "include" });
      const payload = await res.json().catch(() => ({}));
      const ok = res.ok && payload?.ok !== false;
      setApiKeyStatus((prev) => ({ ...prev, [provider]: { ok, message: payload?.message } }));
      setStatus(ok ? `${provider} key looks good` : payload?.message || `Failed to validate ${provider} key`);
    } catch (error: any) {
      setApiKeyStatus((prev) => ({ ...prev, [provider]: { ok: false, message: error?.message || "Unknown error" } }));
      setStatus(`Failed to validate ${provider} key`);
    }
  };

  const saveSettings = async () => {
    setStatus(null);

    const errors: string[] = [];
    if (!settings.tokenAddress || !isChecksumAddress(settings.tokenAddress)) {
      errors.push("Token address is invalid. Please use a checksummed 0x address.");
    }
    const urlFields: Array<{ label: string; value: string }> = [];
    settings.infoLinks.forEach((link) => urlFields.push({ label: `Info link "${link.name || "Unnamed"}"`, value: link.url }));
    settings.footerSocialLinks.forEach((link) => urlFields.push({ label: `Footer social "${link.name || "Unnamed"}"`, value: link.url }));
    settings.footerMenus.forEach((menu) =>
      menu.links.forEach((link) => urlFields.push({ label: `Footer menu "${menu.title || "Untitled"}" link "${link.label || "Unnamed"}"`, value: link.url }))
    );
    urlFields.forEach((f) => {
      try {
        // Throws on invalid URLs
        new URL(f.value);
      } catch {
        errors.push(`${f.label} has an invalid URL`);
      }
    });

    if (errors.length) {
      setValidationErrors(errors);
      setStatus("Please fix the validation issues below");
      return;
    }

    setValidationErrors([]);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
      credentials: "include",
    });
    if (res.ok) {
      setStatus("Settings saved");
      refreshPublicConfig();
    } else {
      setStatus("Failed to save settings");
    }
  };

  const saveApiKey = async (provider: string) => {
    if (!apiKeys[provider as keyof ApiKeysState]) {
      setStatus("Enter a value before saving");
      return;
    }
    setStatus(null);
    const res = await fetch(`/api/admin/api-keys/${provider}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ value: apiKeys[provider as keyof ApiKeysState] }),
    });
    setStatus(res.ok ? "API key saved" : "Failed to save API key");
    fetchApiKeys();
  };

  const removeApiKey = async (provider: string) => {
    setStatus(null);
    const res = await fetch(`/api/admin/api-keys/${provider}`, {
      method: "DELETE",
      credentials: "include",
    });
    setStatus(res.ok ? "API key removed" : "Failed to remove API key");
    fetchApiKeys();
  };

  const removeSingleKey = async (provider: string, index: number) => {
    setStatus(null);
    const res = await fetch(`/api/admin/api-keys/${provider}?index=${index}`, {
      method: "DELETE",
      credentials: "include",
    });
    setStatus(res.ok ? "API key removed" : "Failed to remove API key");
    fetchApiKeys();
  };

  const downloadBackup = async () => {
    setStatus("Preparing backup...");
    const res = await fetch("/api/admin/backup", { method: "POST", credentials: "include" });
    if (!res.ok) {
      setStatus("Backup failed");
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bzr-backup.sql";
    a.click();
    window.URL.revokeObjectURL(url);
    setStatus("Backup downloaded");
  };

  const uploadRestore = async () => {
    if (!restoreFile) {
      setStatus("Select a backup file first");
      return;
    }
    if (!window.confirm("This will restore from backup and overwrite data. Proceed?")) {
      return;
    }
    setStatus("Restoring...");
    setRestoreStatus("Upload started...");
    const form = new FormData();
    form.append("backup", restoreFile);
    const res = await fetch("/api/admin/restore", {
      method: "POST",
      body: form,
      credentials: "include",
    });
    if (res.ok) {
      setStatus("Restore started/completed");
      setRestoreStatus("Restore request accepted. Monitor logs for completion.");
    } else {
      const payload = await res.json().catch(() => ({}));
      setStatus("Restore failed");
      setRestoreStatus(payload?.message || "Restore failed");
    }
  };

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST", credentials: "include" });
    setIsAuthed(false);
  };

  useEffect(() => {
    fetchSettings();
    fetchApiKeys();
  }, []);

  if (isAuthed === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-600">Checking session...</p>
      </div>
    );
  }

  if (isAuthed === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">Admin Login</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Username</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Password</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Log in
            </button>
            {status && <p className="text-xs text-gray-600">{status}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={config.logoUrl} alt="Logo" className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-semibold">Mission Control</h1>
              <p className="text-sm text-gray-500">Admin dashboard</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {status && (
          <div className="bg-blue-50 border border-blue-100 text-blue-800 px-4 py-3 rounded-lg text-sm">
            {status}
          </div>
        )}
        {restoreStatus && (
          <div className="bg-gray-50 border border-gray-200 text-gray-800 px-4 py-3 rounded-lg text-sm">
            {restoreStatus}
          </div>
        )}

        {/* Settings */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold">Brand & Token</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-gray-500" />
                Logo URL
              </label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={settings.logoUrl}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-gray-500" />
                Token Address
              </label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                value={settings.tokenAddress}
                onChange={(e) => setSettings({ ...settings, tokenAddress: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-gray-600">Footer About Text</label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                rows={3}
                value={settings.aboutText}
                onChange={(e) => setSettings({ ...settings, aboutText: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-gray-600">Footer Copyright Text</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={settings.copyrightText}
                onChange={(e) => setSettings({ ...settings, copyrightText: e.target.value })}
              />
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mt-4">
              <div className="font-semibold mb-1">Please fix these issues:</div>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="md:col-span-1">
              <label className="text-sm text-gray-600 mb-2 block">Information Card Links</label>
              <p className="text-xs text-gray-500 mb-2">Shown on the right-hand “Information” card (contract + socials).</p>
              <SocialLinksEditor
                links={settings.infoLinks}
                onChange={(links) => setSettings({ ...settings, infoLinks: links })}
                addLabel="Add info link"
              />
            </div>

            <div className="md:col-span-1">
              <label className="text-sm text-gray-600 mb-2 block">Footer & Community Social Links</label>
              <p className="text-xs text-gray-500 mb-2">Used in the footer Community column and the Community card.</p>
              <SocialLinksEditor
                links={settings.footerSocialLinks}
                onChange={(links) => setSettings({ ...settings, footerSocialLinks: links })}
                addLabel="Add footer/community link"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="text-sm text-gray-600 mb-2 block">Footer Menus</label>
            <p className="text-xs text-gray-500 mb-3">Edit the Markets &amp; Data, Exchanges, and Community sections displayed in the footer.</p>
            <FooterMenusEditor
              menus={settings.footerMenus}
              onChange={(menus) => setSettings({ ...settings, footerMenus: menus })}
            />
          </div>

          {/* Preview */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Preview: Information Card Links</h3>
              <ul className="space-y-1 text-sm text-gray-800">
                {settings.infoLinks.map((link, idx) => (
                  <li key={`preview-info-${idx}`}>
                    {link.name || "Untitled"} — {link.url || "https://"}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Preview: Footer Menus</h3>
              <div className="space-y-2 text-sm text-gray-800">
                {settings.footerMenus.map((menu, idx) => (
                  <div key={`preview-menu-${idx}`}>
                    <div className="font-semibold">{menu.title || "Untitled"}</div>
                    <ul className="ml-2 list-disc list-inside">
                      {(menu.links || []).map((link, lIdx) => (
                        <li key={`preview-menu-${idx}-link-${lIdx}`}>
                          {link.label || "Untitled"} — {link.url || "https://"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={saveSettings}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save settings
            </button>
          </div>
        </section>

        {/* API Keys */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold">API Keys</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {["etherscan", "cronos"].map((provider) => {
              const display = apiKeysDisplay.find((k) => k.provider === provider);
              const keys = display?.keys || [];
              return (
                <div key={provider} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600 capitalize">{provider} API Key{provider === "etherscan" ? "s" : ""}</label>
                    {display && display.count > 0 && (
                      <span className="text-xs text-gray-500">
                        {display.count} saved
                      </span>
                    )}
                  </div>
                  {keys.length > 0 && (
                    <ul className="space-y-1 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2">
                      {keys.map((k, idx) => (
                        <li key={`${provider}-${idx}`} className="flex items-center justify-between gap-2">
                          <span className="font-mono break-all">{k}</span>
                          <button
                            onClick={() => removeSingleKey(provider, idx)}
                            className="text-red-600 hover:text-red-800 text-[11px] border border-red-200 rounded px-2 py-0.5"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <textarea
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={apiKeys[provider as keyof ApiKeysState] || ""}
                    onChange={(e) =>
                      setApiKeys((prev) => ({ ...prev, [provider]: e.target.value }))
                    }
                    placeholder={provider === "etherscan" ? "Comma-separated keys" : "API key"}
                    rows={provider === "etherscan" ? 2 : 1}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => saveApiKey(provider)}
                      className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save {provider}
                    </button>
                    <button
                      onClick={() => testApiKey(provider)}
                      className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-100 px-3 py-2 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                    >
                      <KeyRound className="w-4 h-4" />
                      Test
                    </button>
                    <button
                      onClick={() => removeApiKey(provider)}
                      className="inline-flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-3 py-2 rounded-lg text-sm hover:bg-red-100 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  {apiKeyStatus[provider] && (
                    <p
                      className={`text-xs ${
                        apiKeyStatus[provider].ok ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {apiKeyStatus[provider].ok ? "Key is valid" : apiKeyStatus[provider].message || "Validation failed"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Backup & Restore */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold">Backup & Restore</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Download a full database backup (transfers, holders, settings).
              </p>
              <button
                onClick={downloadBackup}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download backup
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Restore from a previous backup.</p>
              <input
                type="file"
                accept=".sql"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600"
              />
              <button
                onClick={uploadRestore}
                className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Restore backup
              </button>
              {restoreStatus && (
                <p className="text-xs text-gray-700">{restoreStatus}</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
