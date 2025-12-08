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
  const priceChange24h = marketOverview?.priceChange24hPercent ?? null;

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
  const truncatedAddress =
    tokenAddress && tokenAddress.length > 10
      ? `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`
      : tokenAddress;
  const tokenLabel = info?.tokenName || "Bazaars";
  const tokenSymbol = info?.tokenSymbol || "BZR";

  const displayCirculating = marketOverview?.circulatingSupply ?? circulatingSupply;
  const displayMaxSupply = marketOverview?.maxSupply ?? 555555555;

  const hasRange = athUsd !== null && atlUsd !== null && athUsd > atlUsd;
  const priceRangePosition = hasRange
    ? Math.max(0, Math.min(100, ((price - atlUsd) / (athUsd - atlUsd)) * 100))
    : null;

  // Fix loading condition - should be OR not AND
  const isLoading = loadingInfo || loadingPrice || loadingMarket;
  const hasError = infoError || priceError || statsError || transfersError || marketError;

  const softCard = "rounded-xl bg-white shadow-sm p-5";
  const labelMuted = "text-[11px] uppercase tracking-wide text-gray-500 flex items-center gap-1";
  const monoSmall = "font-mono text-sm transition-colors";
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
    <div className="w-full mb-8 space-y-6">
      {/* Hero header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="text-xs uppercase text-gray-500">
              {tokenLabel} ({tokenSymbol})
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                {formatUsdValue(price)}
              </h1>
              <span
                className={`text-xs px-2.5 py-1 rounded-full ${
                  priceChange24h !== null
                    ? priceChange24h >= 0
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {priceChange24h !== null
                  ? `${priceChange24h >= 0 ? "▲" : "▼"} ${Math.abs(priceChange24h).toFixed(2)}% 24h`
                  : "0.00% 24h"}
              </span>
              {marketOverview?.stale && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                  Stale
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 justify-start lg:justify-end">
            <div className="flex items-center gap-2 flex-nowrap overflow-x-auto sm:overflow-visible sm:flex-wrap pr-1">
              {socialLinks.map((link) => {
                const iconKey = (link.icon || resolveSocialIconKey(link)) as SocialIconKey | "twitter";
                const IconComponent = SOCIAL_ICONS[iconKey] || Globe;
                return (
                  <a
                    key={link.name + link.url}
                    href={normalizeSocialUrl(link.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-full bg-gray-50 text-gray-600 hover:text-blue-600 transition-all flex-shrink-0"
                    title={normalizeSocialName(link.name)}
                    aria-label={`Visit ${normalizeSocialName(link.name)}`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <a
                href={`https://etherscan.io/address/${tokenAddress}`}
                target="_blank"
                rel="noreferrer"
                className={`${monoSmall} inline-flex items-center gap-1 text-gray-700`}
              >
                {truncatedAddress || "N/A"}
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
              <button
                onClick={handleCopy}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={copied ? "Address copied" : "Copy address"}
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Financials */}
        <div className={`${softCard} bg-[#F8F9FA] border-none`}>
          <div className={labelMuted}>
            Market Cap
            <InfoPopover
              label="Market cap info"
              content="Market cap equals price multiplied by circulating supply. If marked stale, the value uses the last good fetch or a fallback source."
            />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{formatUsdValue(marketCap)}</div>
        </div>
        <div className={`${softCard} bg-[#F8F9FA] border-none`}>
          <div className={labelMuted}>
            Volume (24h)
            <InfoPopover
              label="24h volume info"
              content="24-hour trading volume across tracked markets, as reported by CoinMarketCap."
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-2xl font-bold text-gray-900">
              {volume24h !== null ? formatUsdValue(volume24h) : "--"}
            </span>
            {volumeChange24hPercent !== null && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  volumeChange24hPercent >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                {volumeChange24hPercent >= 0 ? "▲" : "▼"} {Math.abs(volumeChange24hPercent).toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        <div className={`${softCard} bg-[#F8F9FA] border-none`}>
          <div className={labelMuted}>
            Fully-Diluted Value
            <InfoPopover
              label="FDV info"
              content="Fully diluted value (FDV) equals price multiplied by max supply. If max supply is unknown, FDV uses total supply."
            />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{fdv ? formatUsdValue(fdv) : "--"}</div>
        </div>

        {/* Network */}
        <div className={`${softCard} bg-[#F8F9FA] border-none`}>
          <div className={labelMuted}>
            Holders
            <InfoPopover
              label="Holders info"
              content="Number of wallet addresses holding Bazaars across supported chains."
            />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{stats?.totalHolders?.toLocaleString("en-US") || "…"}</div>
          <div className="text-xs text-gray-500 mt-1">Across supported chains</div>
        </div>
        <div className={`${softCard} bg-[#F8F9FA] border-none`}>
          <div className={labelMuted}>
            Total Transfers
            <InfoPopover
              label="Total transfers info"
              content="Count of total token transfers."
            />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {transfersTotals?.allTimeTotal?.toLocaleString("en-US") || "..."}
          </div>
        </div>
        <div className={`${softCard} bg-[#F8F9FA] border-none`}>
          <div className="flex items-center justify-between">
            <div className={labelMuted}>
              Circulating Supply
              <InfoPopover
                label="Supply info"
                content="Circulating supply shows how much is actively tradable. Max supply is the theoretical maximum minted minus burns."
              />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {displayCirculating ? `${formatSupply(displayCirculating)} BZR` : "--"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Max {displayMaxSupply ? `${formatSupply(displayMaxSupply)} BZR` : "555,555,555 BZR"}
          </div>
        </div>
      </div>

      {/* ATH / ATL range */}
      <div className={`${softCard} bg-[#F8F9FA] border-none`}>
        <div className="grid grid-cols-2 gap-4 items-start mb-4">
          <div>
            <div className={labelMuted}>All-time Low</div>
            <div className="text-lg font-semibold text-gray-900">{atlUsd !== null ? formatUsdValue(atlUsd) : "--"}</div>
            <div className="text-[11px] text-gray-500">
              {atlDate ? `On ${formatDate(atlDate)}` : ""}
              {atlChange !== null && (
                <span className="ml-2 text-green-600">+{atlChange.toFixed(2)}%</span>
              )}
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className={labelMuted}>All-time High</div>
            <div className="text-lg font-semibold text-gray-900">{athUsd !== null ? formatUsdValue(athUsd) : "--"}</div>
            <div className="text-[11px] text-gray-500">
              {athDate ? `On ${formatDate(athDate)}` : ""}
              {athChange !== null && (
                <span className={`ml-2 ${athChange <= 0 ? "text-red-600" : "text-green-600"}`}>
                  {athChange > 0 ? "+" : ""}
                  {athChange.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-2">
          <div className="relative h-1 rounded-full bg-gradient-to-r from-red-200 via-amber-200 to-green-200">
            {priceRangePosition !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `${priceRangePosition}%` }}
              >
                <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm bg-blue-500" />
              </div>
            )}
          </div>
          <div className="flex justify-between text-[11px] text-gray-500 mt-2">
            <span>ATL</span>
            <span>ATH</span>
          </div>
        </div>
      </div>
    </div>
  );
};
