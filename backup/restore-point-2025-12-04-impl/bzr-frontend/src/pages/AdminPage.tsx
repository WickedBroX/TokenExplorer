import React, { useEffect, useState } from "react";
import { Lock, LogOut, Save, Upload, Download, Link2, KeyRound, Image as ImageIcon, Info } from "lucide-react";
import { useAppConfig } from "../context/ConfigContext";
import { DEFAULT_APP_CONFIG } from "../constants/index";

type SettingsPayload = {
  logoUrl: string;
  aboutText: string;
  copyrightText: string;
  tokenAddress: string;
  infoLinks: { name: string; url: string }[];
  footerSocialLinks: { name: string; url: string }[];
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
};

const SocialLinksEditor: React.FC<{
  links: { name: string; url: string }[];
  onChange: (links: { name: string; url: string }[]) => void;
  addLabel?: string;
  namePlaceholder?: string;
  urlPlaceholder?: string;
}> = ({ links, onChange, addLabel = "Add link", namePlaceholder = "Name (e.g., X)", urlPlaceholder = "https://" }) => {
  const updateLink = (index: number, key: "name" | "url", value: string) => {
    const next = [...links];
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  };

  const addLink = () => onChange([...links, { name: "", url: "" }]);
  const removeLink = (index: number) => onChange(links.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {links.map((link, index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder={namePlaceholder}
            value={link.name}
            onChange={(e) => updateLink(index, "name", e.target.value)}
          />
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
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "" });
  const [settings, setSettings] = useState<SettingsPayload>({
    logoUrl: config.logoUrl || DEFAULT_APP_CONFIG.logoUrl,
    aboutText: config.aboutText || DEFAULT_APP_CONFIG.aboutText,
    copyrightText: config.copyrightText || DEFAULT_APP_CONFIG.copyrightText,
    tokenAddress: config.tokenAddress || DEFAULT_APP_CONFIG.tokenAddress,
    infoLinks: config.infoLinks || DEFAULT_APP_CONFIG.infoLinks,
    footerSocialLinks: config.footerSocialLinks || DEFAULT_APP_CONFIG.footerSocialLinks,
    footerMenus: config.footerMenus || DEFAULT_APP_CONFIG.footerMenus,
  });
  const [apiKeys, setApiKeys] = useState<ApiKeysState>({});
  const [apiKeysDisplay, setApiKeysDisplay] = useState<ApiKeysDisplay[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

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
        infoLinks: payload.infoLinks || DEFAULT_APP_CONFIG.infoLinks,
        footerSocialLinks: payload.footerSocialLinks || DEFAULT_APP_CONFIG.footerSocialLinks,
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

  const saveSettings = async () => {
    setStatus(null);
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
    setStatus("Restoring...");
    const form = new FormData();
    form.append("backup", restoreFile);
    const res = await fetch("/api/admin/restore", {
      method: "POST",
      body: form,
      credentials: "include",
    });
    setStatus(res.ok ? "Restore started/completed" : "Restore failed");
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveApiKey(provider)}
                      className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save {provider}
                    </button>
                    <button
                      onClick={() => removeApiKey(provider)}
                      className="inline-flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-3 py-2 rounded-lg text-sm hover:bg-red-100 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
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
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
