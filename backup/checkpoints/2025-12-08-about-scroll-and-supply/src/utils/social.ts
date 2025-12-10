export type SocialIconKey =
  | "website"
  | "whitepaper"
  | "x"
  | "telegram"
  | "discord"
  | "medium"
  | "facebook"
  | "instagram";

const ICON_ALIASES: Record<string, SocialIconKey> = {
  website: "website",
  "official site": "website",
  site: "website",
  homepage: "website",
  link: "website",
  docs: "whitepaper",
  documentation: "whitepaper",
  whitepaper: "whitepaper",
  paper: "whitepaper",
  x: "x",
  twitter: "x",
  telegram: "telegram",
  tg: "telegram",
  discord: "discord",
  medium: "medium",
  facebook: "facebook",
  instagram: "instagram",
  insta: "instagram",
};

const normalizeKey = (value?: string | null) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const resolveSocialIconKey = (link: { icon?: string | null; name?: string | null }): SocialIconKey => {
  const candidates = [link?.icon, link?.name];
  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    if (normalized && ICON_ALIASES[normalized]) {
      return ICON_ALIASES[normalized];
    }
  }
  return "website";
};

export const normalizeSocialName = (name: string) =>
  name?.toLowerCase() === "twitter" ? "X" : name;

export const normalizeSocialUrl = (url?: string) =>
  typeof url === "string"
    ? url.replace(/https?:\/\/(www\.)?twitter\.com/gi, "https://x.com")
    : "#";

export const SOCIAL_ICON_OPTIONS: { value: SocialIconKey; label: string }[] = [
  { value: "website", label: "Website / Link" },
  { value: "whitepaper", label: "Whitepaper / Docs" },
  { value: "x", label: "X (Twitter)" },
  { value: "telegram", label: "Telegram" },
  { value: "discord", label: "Discord" },
  { value: "medium", label: "Medium" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
];
