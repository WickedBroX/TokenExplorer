import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  Check,
  Globe,
  Send,
  FileText,
  ExternalLink,
  Info,
  BookOpen,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
} from "lucide-react";
import { useTokenInfo } from "../hooks/api/useTokenInfo";
import { useTokenStats } from "../hooks/api/useTokenStats";
import { useTokenPrice } from "../hooks/api/useTokenPrice";
import { useTransfers } from "../hooks/api/useTransfers";
import { useMarketOverview } from "../hooks/api/useMarketOverview";
import { formatUsdValue } from "../utils/formatters";
import { useAppConfig } from "../context/ConfigContext";
import XLogoIcon from "./icons/XLogoIcon";
import {
  normalizeSocialName,
  normalizeSocialUrl,
  resolveSocialIconKey,
  type SocialIconKey,
} from "../utils/social";

// Utility function for consistent supply formatting
const formatSupply = (value: number): string => {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
};

const DiscordIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const InfoPopover: React.FC<{
  label: string;
  content: React.ReactNode;
}> = ({ label, content }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [positionStyle, setPositionStyle] = useState<{
    width: number;
    left: number;
    top: number;
  }>({ width: 280, left: 0, top: 0 });
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-info-popover", "true");
    document.body.appendChild(el);
    setPortalEl(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePlacement = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) return;

      const margin = 12;
      const preferredWidth = Math.min(320, window.innerWidth - margin * 2);
      const idealLeft =
        triggerRect.left + triggerRect.width / 2 - preferredWidth / 2;
      const clampedLeft = Math.max(
        margin,
        Math.min(
          idealLeft,
          window.innerWidth - margin - preferredWidth
        )
      );
      const top = triggerRect.bottom + 8; // 8px offset below trigger

      setPositionStyle({
        width: preferredWidth,
        left: clampedLeft,
        top,
      });
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [open]);

  return (
    <div className="relative inline-flex" ref={triggerRef}>
      <button
        type="button"
        aria-label={label}
        className="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && portalEl && createPortal(
        <div
          className="fixed z-[9999] bg-white border border-gray-200 shadow-xl rounded-2xl p-3 text-[#374151] whitespace-normal break-words font-normal tracking-[0px]"
          style={{
            width: `${positionStyle.width}px`,
            maxWidth: "calc(100vw - 24px)",
            left: `${positionStyle.left}px`,
            top: `${positionStyle.top}px`,
            fontSize: "11px",
            lineHeight: "16px",
            fontWeight: 400,
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {content}
        </div>,
        portalEl
      )}
    </div>
  );
};

// Social link icons mapping
const SOCIAL_ICONS: Record<SocialIconKey | "twitter", React.ElementType> = {
  website: Globe,
  x: XLogoIcon,
  twitter: XLogoIcon,
  telegram: Send,
  discord: DiscordIcon,
  medium: BookOpen,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  whitepaper: FileText,
};

export const TokenOverviewHeader: React.FC = () => {
  const {
    data: info,
    isLoading: loadingInfo,
    error: infoError,
  } = useTokenInfo();
  const { data: stats, error: statsError } = useTokenStats();
  const {
    data: tokenPrice,
    isLoading: loadingPrice,
    error: priceError,
  } = useTokenPrice();
  const {
    data: marketOverview,
    isLoading: loadingMarket,
    error: marketError,
  } = useMarketOverview();
  const { data: transfersData, error: transfersError } = useTransfers({
    chainId: 0,
    page: 1,
    pageSize: 1,
  });

  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const { config } = useAppConfig();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(config.tokenAddress);
    setCopied(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  // Memoize calculations
  const totalSupply = useMemo(() => {
    return info?.formattedTotalSupply ? Number(info.formattedTotalSupply) : 0;
  }, [info?.formattedTotalSupply]);

  const circulatingSupply = useMemo(() => {
    return info?.formattedCirculatingSupply
      ? Number(info.formattedCirculatingSupply)
      : totalSupply;
  }, [info?.formattedCirculatingSupply, totalSupply]);

  const price = marketOverview?.priceUsd ?? tokenPrice?.priceUsd ?? 0;
  const athUsd = marketOverview?.athUsd ?? null;
  const atlUsd = marketOverview?.atlUsd ?? null;
  const athChange = marketOverview?.athChangePercent ?? null;
  const atlChange = marketOverview?.atlChangePercent ?? null;
  const athDate = marketOverview?.athDate ? new Date(marketOverview.athDate) : null;
  const atlDate = marketOverview?.atlDate ? new Date(marketOverview.atlDate) : null;

  const marketCap = useMemo(() => {
    if (marketOverview?.marketCapUsd) return marketOverview.marketCapUsd;
    return circulatingSupply * price;
  }, [circulatingSupply, marketOverview?.marketCapUsd, price]);

  const fdv = useMemo(() => {
    if (marketOverview?.fdvUsd) return marketOverview.fdvUsd;
    return price * 555555555;
  }, [marketOverview?.fdvUsd, price]);

  const volume24h = marketOverview?.volume24hUsd ?? null;
  const volumeChange24hPercent = marketOverview?.volumeChange24hPercent ?? null;
  const volMcapRatio = marketOverview?.volMarketCapRatio ?? null;
  const selfReportedSupply = marketOverview?.selfReportedCirculatingSupply ?? null;

  const transfersTotals = transfersData?.totals;
  const socialLinks = useMemo(
    () =>
      (config.infoLinks || []).map((link) => ({
        ...link,
        icon: resolveSocialIconKey(link),
        name: normalizeSocialName(link.name),
        url: normalizeSocialUrl(link.url),
      })),
    [config.infoLinks]
  );
  const tokenAddress = config.tokenAddress;

  // Fix loading condition - should be OR not AND
  const isLoading = loadingInfo || loadingPrice || loadingMarket;
  const hasError = infoError || priceError || statsError || transfersError || marketError;

  const metricCard =
    "rounded-2xl border border-gray-200 p-5 bg-white shadow-sm flex flex-col gap-1.5";
  const metricCardStyle = { fontSize: "12px", lineHeight: "16px" };
  const labelText =
    "font-normal tracking-[0px] text-gray-600 uppercase flex items-center gap-1";
  const labelStyle = { fontSize: "12px", lineHeight: "16px" };
  const valueText = "font-normal text-gray-900";
  const valueStyle = { fontSize: "12px", lineHeight: "16px" };
  const smallNoteText = "font-normal text-gray-500";
  const smallNoteStyle = { fontSize: "12px", lineHeight: "16px" };
  const formatDate = (date: Date | null) =>
    date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  if (isLoading) {
    return (
      <div className="w-full h-72 bg-gray-100 animate-pulse rounded-xl mb-8" />
    );
  }

  if (hasError) {
    return (
      <div className="w-full mb-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800 font-medium mb-2">
            Error loading token data
          </p>
          <p className="text-sm text-red-600">
            {(infoError as Error)?.message ||
              (priceError as Error)?.message ||
              "Please try again later"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT CARD: OVERVIEW (Price & Supply) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-0 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Overview</h2>
          </div>

          <div className="p-6 grid gap-5 text-[12px] leading-[16px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={metricCard} style={metricCardStyle}>
                <div className={labelText} style={labelStyle}>BZR Price</div>
                <div className="flex items-center gap-3">
                  <span className={valueText} style={valueStyle}>{formatUsdValue(price)}</span>
                  {marketOverview?.stale && (
                    <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full" style={valueStyle}>
                      Stale
                    </span>
                  )}
                </div>
              </div>
              <div className={metricCard} style={metricCardStyle}>
                <div className={labelText} style={labelStyle}>
                  Market Cap
                  <InfoPopover
                    label="Market cap info"
                    content={
                      "Market cap equals price multiplied by circulating supply. If marked stale, the value uses the last good fetch or a fallback source."
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className={valueText} style={valueStyle}>{formatUsdValue(marketCap)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={metricCard} style={metricCardStyle}>
                <div className={labelText} style={labelStyle}>
                  Volume (24h)
                  <InfoPopover
                    label="24h volume info"
                    content="24-hour trading volume across tracked markets, as reported by CoinMarketCap."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className={valueText} style={valueStyle}>{volume24h !== null ? formatUsdValue(volume24h) : "--"}</span>
                  {volumeChange24hPercent !== null && (
                    <span
                      className={`font-normal ${
                        volumeChange24hPercent >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                      style={valueStyle}
                    >
                      {volumeChange24hPercent >= 0 ? "▲" : "▼"} {Math.abs(volumeChange24hPercent).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              <div className={metricCard} style={metricCardStyle}>
                <div className={labelText} style={labelStyle}>
                  Fully-Diluted Value
                  <InfoPopover
                    label="FDV info"
                    content="Fully diluted value (FDV) equals price multiplied by max supply. If max supply is unknown, FDV uses total supply."
                  />
                </div>
                <div className={valueText} style={valueStyle}>{fdv ? formatUsdValue(fdv) : "--"}</div>
              </div>

              <div className={metricCard} style={metricCardStyle}>
                <div className={labelText} style={labelStyle}>
                  Volume / Market Cap (24h)
                  <InfoPopover
                    label="Volume to market cap ratio"
                    content="24-hour volume divided by market cap. Higher ratios can indicate stronger turnover."
                  />
                </div>
                <div className={valueText} style={valueStyle}>{volMcapRatio !== null ? `${(volMcapRatio * 100).toFixed(4)}%` : "--"}</div>
              </div>

              <div className={metricCard} style={metricCardStyle}>
                <div className={labelText} style={labelStyle}>
                  Holders
                  <InfoPopover
                    label="Holders info"
                    content="Number of wallet addresses holding Bazaars. The list of wallet addresses is derived from the contracts of each token and the list may not be exhaustive."
                  />
                </div>
                <div className={valueText} style={valueStyle}>{stats?.totalHolders?.toLocaleString("en-US") || "…"}</div>
                <div
                  className="text-gray-500 mt-1"
                  style={{ fontSize: "12px", lineHeight: "16px", fontWeight: 400 }}
                >
                  Across supported chains
                </div>
              </div>

              <div className={metricCard} style={metricCardStyle}>
                <div className={labelText} style={labelStyle}>All-time High</div>
                <div className="flex items-center justify-between">
                  <span className={valueText} style={valueStyle}>{athUsd !== null ? formatUsdValue(athUsd) : "--"}</span>
                  {athChange !== null && (
                    <span className={`font-normal ${athChange <= 0 ? "text-red-600" : "text-green-600"}`} style={valueStyle}>
                      {athChange > 0 ? "+" : ""}
                      {athChange.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className={smallNoteText} style={smallNoteStyle}>{athDate ? `On ${formatDate(athDate)}` : ""}</div>
              </div>

              <div className={metricCard} style={metricCardStyle}>
                <div className={labelText} style={labelStyle}>All-time Low</div>
                <div className="flex items-center justify-between">
                  <span className={valueText} style={valueStyle}>{atlUsd !== null ? formatUsdValue(atlUsd) : "--"}</span>
                  {atlChange !== null && (
                    <span className={`font-normal ${atlChange >= 0 ? "text-green-600" : "text-red-600"}`} style={valueStyle}>
                      {atlChange > 0 ? "+" : ""}
                      {atlChange.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className={smallNoteText} style={smallNoteStyle}>{atlDate ? `On ${formatDate(atlDate)}` : ""}</div>
              </div>

              <div className={metricCard} style={metricCardStyle}>
                <div className={labelText} style={labelStyle}>
                  Circulating Supply
                  <InfoPopover
                    label="Circulating supply info"
                    content="Total supply = total coins created minus any coins that have been burned. It is comparable to outstanding shares in the stock market."
                  />
                </div>
                <div className={valueText} style={valueStyle}>{formatSupply(totalSupply)} BZR</div>
              </div>

              <div className={metricCard} style={metricCardStyle}>
                <div className={labelText} style={labelStyle}>
                  Max Supply
                  <InfoPopover
                    label="Max supply info"
                    content="Best approximation of the maximum coins that will ever exist, minus any coins that have been verifiably burned (theoretical max minted minus burned)."
                  />
                </div>
                <div className={valueText} style={valueStyle}>
                  {marketOverview?.maxSupply ? `${formatSupply(marketOverview.maxSupply)} BZR` : "555,555,555 BZR"}
                </div>
              </div>

              <div className={metricCard} style={metricCardStyle}>
                <div className={labelText} style={labelStyle}>
                  Total Transfers
                  <InfoPopover
                    label="Total transfers info"
                    content="Count of total token transfers."
                  />
                </div>
                <div className={valueText} style={valueStyle}>
                  {transfersTotals?.allTimeTotal?.toLocaleString("en-US") || "..."}
                </div>
              </div>

              <div className={metricCard} style={metricCardStyle}>
                <div className={labelText} style={labelStyle}>
                  Self-reported circulating supply
                  <InfoPopover
                    label="Self-reported circulating supply info"
                    content="Self-reported circulating supply as reported to CoinMarketCap. Treat with caution if flagged."
                  />
                </div>
                <div className={valueText} style={valueStyle}>{selfReportedSupply ? `${formatSupply(selfReportedSupply)} BZR` : "—"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: PROFILE SUMMARY */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm p-0 overflow-hidden flex flex-col">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Information</h2>
          </div>

          <div className="p-6 flex-1 space-y-6">
            {/* Contract */}
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Contract
              </div>
              <div className="flex items-center gap-2 group min-w-0">
                <a
                  href={`https://etherscan.io/address/${tokenAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 font-mono truncate hover:text-blue-800 transition-colors flex-1 min-w-0"
                >
                  {tokenAddress}
                </a>
                <button
                  onClick={handleCopy}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-all flex-shrink-0"
                  aria-label={copied ? "Address copied" : "Copy address"}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Official Site */}
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Official Site
              </div>
              {(() => {
                const websiteLink =
                  socialLinks.find((link) => link.icon === "website") || socialLinks[0];
                return (
                  <a
                    href={websiteLink?.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {websiteLink?.name || "Website"}
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </a>
                );
              })()}
            </div>

            {/* Socials */}
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                Social Profiles
              </div>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((link) => {
                  const iconKey = (link.icon || resolveSocialIconKey(link)) as SocialIconKey | "twitter";
                  const IconComponent = SOCIAL_ICONS[iconKey] || Globe;
                  return (
                    <a
                      key={link.name + link.url}
                      href={normalizeSocialUrl(link.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-1"
                      title={normalizeSocialName(link.name)}
                      aria-label={`Visit ${normalizeSocialName(link.name)}`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="text-xs font-medium">
                        {normalizeSocialName(link.name)}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
