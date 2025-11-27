import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Copy,
  Check,
  Globe,
  Twitter,
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
import { formatUsdValue } from "../utils/formatters";
import { BZR_TOKEN_ADDRESS, SOCIAL_LINKS } from "../constants/index";

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

// Social link icons mapping
const SOCIAL_ICONS = {
  Website: Globe,
  Twitter: Twitter,
  Telegram: Send,
  Discord: DiscordIcon,
  Medium: BookOpen,
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  Whitepaper: FileText,
} as const;

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
  const { data: transfersData, error: transfersError } = useTransfers({
    chainId: 0,
    page: 1,
    pageSize: 1,
  });

  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(BZR_TOKEN_ADDRESS);
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

  const price = tokenPrice?.priceUsd || 0;

  const marketCap = useMemo(() => {
    return circulatingSupply * price;
  }, [circulatingSupply, price]);

  const transfersTotals = transfersData?.totals;

  // Fix loading condition - should be OR not AND
  const isLoading = loadingInfo || loadingPrice;
  const hasError = infoError || priceError || statsError || transfersError;

  if (isLoading) {
    return (
      <div className="w-full h-64 bg-gray-100 animate-pulse rounded-xl mb-8" />
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

          <div className="p-6 grid gap-6">
            {/* Price Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-6 border-b border-gray-100">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  BZR PRICE
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatUsdValue(price)}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                  Market Cap
                  <Info
                    className="w-3 h-3"
                    aria-label="Market capitalization is the total value of all tokens in circulation"
                  />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatUsdValue(marketCap)}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <div className="flex justify-between sm:block">
                <span className="text-sm text-gray-500 block mb-1">
                  Total Supply:
                </span>
                <span className="font-medium text-gray-900">
                  {formatSupply(totalSupply)} BZR
                </span>
              </div>

              <div className="flex justify-between sm:block">
                <span className="text-sm text-gray-500 block mb-1">
                  Max Supply:
                </span>
                <span className="font-medium text-gray-900">
                  555,555,555 BZR
                </span>
              </div>

              <div className="flex justify-between sm:block">
                <span className="text-sm text-gray-500 block mb-1">
                  Holders:
                </span>
                <span className="font-medium text-gray-900">
                  {stats?.totalHolders?.toLocaleString("en-US") || "..."}
                </span>
              </div>

              <div className="flex justify-between sm:block">
                <span className="text-sm text-gray-500 block mb-1">
                  Total Transfers:
                </span>
                <span className="font-medium text-gray-900">
                  {transfersTotals?.allTimeTotal?.toLocaleString("en-US") ||
                    "..."}
                </span>
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
                  href={`https://etherscan.io/address/${BZR_TOKEN_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 font-mono truncate hover:text-blue-800 transition-colors flex-1 min-w-0"
                >
                  {BZR_TOKEN_ADDRESS}
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
              <a
                href={SOCIAL_LINKS[0].url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
              >
                bazaars.app <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
            </div>

            {/* Socials */}
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                Social Profiles
              </div>
              <div className="flex gap-2">
                {SOCIAL_LINKS.filter((link) =>
                  [
                    "Website",
                    "Twitter",
                    "Telegram",
                    "Discord",
                    "Medium",
                    "Whitepaper",
                  ].includes(link.name)
                ).map((link: { name: string; url: string }) => {
                  const IconComponent =
                    SOCIAL_ICONS[link.name as keyof typeof SOCIAL_ICONS];
                  return (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                      title={link.name}
                      aria-label={`Visit ${link.name}`}
                    >
                      <IconComponent className="w-4 h-4" />
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
