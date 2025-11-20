import { useState } from "react";
import {
  Copy,
  Check,
  Globe,
  Twitter,
  Send,
  FileText,
  ExternalLink,
  Info,
} from "lucide-react";
import { useTokenInfo } from "../hooks/api/useTokenInfo";
import { useTokenStats } from "../hooks/api/useTokenStats";
import { useTokenPrice } from "../hooks/api/useTokenPrice";
import { useTransfers } from "../hooks/api/useTransfers";
import { formatUsdValue } from "../utils/formatters";

const SOCIAL_LINKS = [
  { name: "Website", icon: Globe, url: "https://bazaars.app" },
  { name: "Twitter", icon: Twitter, url: "https://twitter.com/BazaarsBzr" },
  { name: "Telegram", icon: Send, url: "https://t.me/Bazaarsapp" },
  { name: "Whitepaper", icon: FileText, url: "https://bazaars.app/whitepaper" },
];

export const TokenOverviewHeader = () => {
  const { data: info, isLoading: loadingInfo } = useTokenInfo();
  const { data: stats } = useTokenStats();
  const { data: tokenPrice } = useTokenPrice();
  const { data: transfersData } = useTransfers({
    chainId: 0,
    page: 1,
    pageSize: 1,
  });
  const transfersTotals = transfersData?.totals;

  const [copied, setCopied] = useState(false);
  const BZR_ADDRESS = "0x85Cb098bdcD3Ca929d2cD18Fc7A2669fF0362242";

  const handleCopy = () => {
    navigator.clipboard.writeText(BZR_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate Market Cap
  const totalSupply = info?.formattedTotalSupply
    ? Number(info.formattedTotalSupply)
    : 555555555; // Fallback if loading
  const price = tokenPrice?.priceUsd || 0;
  const marketCap = totalSupply * price;

  if (loadingInfo && !tokenPrice) {
    return (
      <div className="w-full h-64 bg-gray-100 animate-pulse rounded-xl mb-8" />
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
                  Market Cap <Info className="w-3 h-3" />
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
                  {totalSupply.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  BZR
                </span>
              </div>

              <div className="flex justify-between sm:block">
                <span className="text-sm text-gray-500 block mb-1">
                  Circulating Supply:
                </span>
                <span className="font-medium text-gray-900 flex items-center gap-1">
                  {(info?.formattedCirculatingSupply
                    ? Number(info.formattedCirculatingSupply)
                    : totalSupply
                  ).toLocaleString("en-US", { maximumFractionDigits: 0 })}{" "}
                  BZR
                  <Check className="w-3 h-3 text-blue-500" />
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
                  href={`https://etherscan.io/address/${BZR_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 font-mono truncate hover:text-blue-800 transition-colors flex-1 min-w-0"
                >
                  {BZR_ADDRESS}
                </a>
                <button
                  onClick={handleCopy}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-all flex-shrink-0"
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
                href="https://bazaars.app"
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
                {SOCIAL_LINKS.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                    title={link.name}
                  >
                    <link.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
