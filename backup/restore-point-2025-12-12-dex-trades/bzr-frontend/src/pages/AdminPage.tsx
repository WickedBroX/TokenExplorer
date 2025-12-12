import React, { useEffect, useState } from "react";
import {
  Lock,
  LogOut,
  Save,
  Upload,
  Download,
  KeyRound,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import { useAppConfig } from "../context/ConfigContext";
import { DEFAULT_APP_CONFIG } from "../constants/index";
import { resolveSocialIconKey, type SocialIconKey } from "../utils/social";
import { SocialLinksEditor } from "../components/admin/SocialLinksEditor";
import { FooterMenusEditor } from "../components/admin/FooterMenusEditor";
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
  const [settingsBaseline, setSettingsBaseline] = useState<string | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeysState>({});
  const [apiKeysDisplay, setApiKeysDisplay] = useState<ApiKeysDisplay[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, { ok: boolean; message?: string }>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [restoreLogs, setRestoreLogs] = useState<string[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
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
      const nextSettings: SettingsPayload = {
        logoUrl: payload.logoUrl || DEFAULT_APP_CONFIG.logoUrl,
        aboutText: payload.aboutText || DEFAULT_APP_CONFIG.aboutText,
        copyrightText: payload.copyrightText || DEFAULT_APP_CONFIG.copyrightText,
        tokenAddress: payload.tokenAddress || DEFAULT_APP_CONFIG.tokenAddress,
        infoLinks: normalizeSocialLinks(payload.infoLinks || DEFAULT_APP_CONFIG.infoLinks),
        footerSocialLinks: normalizeSocialLinks(payload.footerSocialLinks || DEFAULT_APP_CONFIG.footerSocialLinks),
        footerMenus: payload.footerMenus || DEFAULT_APP_CONFIG.footerMenus,
      };
      setSettings(nextSettings);
      setSettingsBaseline(JSON.stringify(nextSettings));
      setSettingsDirty(false);
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

  const normalizeUrlForSave = (value: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return "";
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  };

  const saveSettings = async () => {
    setStatus(null);

    const normalizedSettings: SettingsPayload = {
      ...settings,
      infoLinks: settings.infoLinks.map((link) => ({
        ...link,
        url: normalizeUrlForSave(link.url),
      })),
      footerSocialLinks: settings.footerSocialLinks.map((link) => ({
        ...link,
        url: normalizeUrlForSave(link.url),
      })),
      footerMenus: settings.footerMenus.map((menu) => ({
        ...menu,
        links: (menu.links || []).map((link) => ({
          ...link,
          url: normalizeUrlForSave(link.url),
        })),
      })),
    };

    const errors: string[] = [];
    if (!normalizedSettings.tokenAddress || !isChecksumAddress(normalizedSettings.tokenAddress)) {
      errors.push("Token address is invalid. Please use a checksummed 0x address.");
    }
    const urlFields: Array<{ label: string; value: string }> = [];
    normalizedSettings.infoLinks.forEach((link) => urlFields.push({ label: `Info link "${link.name || "Unnamed"}"`, value: link.url }));
    normalizedSettings.footerSocialLinks.forEach((link) => urlFields.push({ label: `Footer social "${link.name || "Unnamed"}"`, value: link.url }));
    normalizedSettings.footerMenus.forEach((menu) =>
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
    // Persist any URL normalization before saving.
    setSettings(normalizedSettings);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizedSettings),
      credentials: "include",
    });
    if (res.ok) {
      setStatus("Settings saved");
      setSettingsBaseline(JSON.stringify(settings));
      setSettingsDirty(false);
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
    const appendRestoreLog = (message: string) => {
      setRestoreLogs((prev) => [
        ...prev,
        `${new Date().toLocaleTimeString()} — ${message}`,
      ]);
    };

    if (!restoreFile) {
      setStatus("Select a backup file first");
      appendRestoreLog("No backup file selected");
      return;
    }
    if (!window.confirm("This will restore from backup and overwrite data. Proceed?")) {
      appendRestoreLog("Restore cancelled by operator");
      return;
    }

    setIsRestoring(true);
    setStatus("Restoring...");
    setRestoreStatus("Uploading backup...");
    setRestoreLogs((prev) => [
      ...prev,
      `--- Restore run ${new Date().toISOString()} ---`,
    ]);
    appendRestoreLog(
      `Uploading ${restoreFile.name} (${(restoreFile.size / 1024 / 1024).toFixed(1)} MB)`
    );

    try {
      const form = new FormData();
      form.append("backup", restoreFile);
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      if (res.ok) {
        setStatus("Restore completed");
        setRestoreStatus("Restore completed successfully.");
        appendRestoreLog("Restore completed successfully.");
      } else {
        const payload = await res.json().catch(() => ({}));
        const msg = payload?.message || "Restore failed";
        setStatus("Restore failed");
        setRestoreStatus(msg);
        appendRestoreLog(`Restore failed: ${msg}`);
      }
    } catch (error: any) {
      const msg = error?.message || "Restore failed";
      setStatus("Restore failed");
      setRestoreStatus(msg);
      appendRestoreLog(`Restore failed: ${msg}`);
    } finally {
      setIsRestoring(false);
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

  useEffect(() => {
    if (settingsBaseline === null) return;
    setSettingsDirty(JSON.stringify(settings) !== settingsBaseline);
  }, [settings, settingsBaseline]);

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-semibold">Brand & Token</h2>
            </div>
            {settingsDirty && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full">
                Unsaved changes
              </span>
            )}
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
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Preview: Information Card Links
              </h3>
              <ul className="space-y-1 text-sm text-gray-800">
                {settings.infoLinks.map((link, idx) => (
                  <li key={`preview-info-${idx}`}>
                    {link.name || "Untitled"} — {link.url || "https://"}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Preview: Footer Menus
              </h3>
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
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Preview: Footer & Community Social Links
              </h3>
              <ul className="space-y-1 text-sm text-gray-800">
                {settings.footerSocialLinks.map((link, idx) => (
                  <li key={`preview-footer-social-${idx}`}>
                    {link.name || "Untitled"} — {link.url || "https://"}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={saveSettings}
              disabled={!settingsDirty}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={settingsDirty ? "Save settings" : "No changes to save"}
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
                disabled={isRestoring}
                className="block w-full text-sm text-gray-600"
              />
              <button
                onClick={uploadRestore}
                disabled={isRestoring}
                className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                {isRestoring ? "Restoring..." : "Restore backup"}
              </button>
              {restoreStatus && (
                <p className="text-xs text-gray-700">{restoreStatus}</p>
              )}
              {restoreLogs.length > 0 && (
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-mono h-28 overflow-auto whitespace-pre-wrap">
                  {restoreLogs.join("\n")}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
