import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Download, Eye, RefreshCw, Repeat } from "lucide-react";
import { useDexTrades } from "../hooks/api/useDexTrades";
import { useTransfers } from "../hooks/api/useTransfers";
import { LoadingSpinner } from "../components";
import { exportDexTradesToCSV } from "../utils/exportUtils";
import {
  formatUsdValue,
  formatValue,
  getExplorerUrl,
  getExplorerBlockUrl,
  timeAgo,
  truncateHash,
} from "../utils/formatters";
import type { DexTrade } from "../types/api";

export const DexTradesPage: React.FC = () => {
  const [chainId, setChainId] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [copiedTxHash, setCopiedTxHash] = useState<string | null>(null);
  const [activeDexTooltipKey, setActiveDexTooltipKey] = useState<string | null>(
    null
  );
  const FALLBACK_CHAINS = useMemo(
    () => [
      { id: 1, name: "Ethereum" },
      { id: 10, name: "Optimism" },
      { id: 56, name: "BSC" },
      { id: 137, name: "Polygon" },
      { id: 324, name: "zkSync" },
      { id: 5000, name: "Mantle" },
      { id: 42161, name: "Arbitrum" },
      { id: 43114, name: "Avalanche" },
      { id: 8453, name: "Base" },
      { id: 25, name: "Cronos" },
    ],
    []
  );

  // Debounce search to avoid refetch per keystroke
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  const getSearchParams = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return { address: undefined, hash: undefined };

    if (trimmed.startsWith("0x") && trimmed.length === 66) {
      return { address: undefined, hash: trimmed };
    }

    if (trimmed.startsWith("0x") && trimmed.length === 42) {
      return { address: trimmed, hash: undefined };
    }

    return { address: undefined, hash: undefined };
  };

  const searchParams = getSearchParams(debouncedSearchQuery);

  const {
    data: tradesData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useDexTrades({
    chainId,
    page,
    pageSize,
    sort,
    address: searchParams.address,
    hash: searchParams.hash,
  });

  // Available chains from transfers endpoint (includes All Chains)
  const { data: transfersData } = useTransfers({
    chainId: 0,
    page: 1,
    pageSize: 1,
  });
  const dexSupportedChains =
    (tradesData as any)?.supportedChains && Array.isArray((tradesData as any).supportedChains)
      ? ((tradesData as any).supportedChains as Array<{ id: number; name: string }>)
      : null;

  // Show all supported chains in the dropdown (same set as Transfers),
  // even if DEX pools/trades are currently missing for some chains.
  // Still use backend-reported supported DEX chains to ensure naming consistency when available.
  const transfersChains = (transfersData?.availableChains || []).filter(
    (c) => c.id !== 0
  );
  const dexChainNameById = new Map<number, string>(
    (dexSupportedChains || []).map((c) => [c.id, c.name])
  );
  const baseChains = transfersChains.length ? transfersChains : FALLBACK_CHAINS;
  const mergedChains = baseChains.map((c) => ({
    id: c.id,
    name: dexChainNameById.get(c.id) || c.name,
  }));
  const availableChains = [
    { id: 0, name: "All Chains" },
    ...mergedChains,
  ];

  const chainName =
    availableChains.find((c) => c.id === chainId)?.name || "All Chains";

  const trades = tradesData?.data || [];
  const pagination = tradesData?.pagination;
  const total = pagination?.total ?? trades.length;
  const totalPages =
    total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  // Client-side search for partial input (current page only)
  const visibleTrades = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return trades;
    const q = debouncedSearchQuery.trim().toLowerCase();
    return trades.filter((t) => {
      const tx = t.txHash?.toLowerCase() || "";
      const trader = t.traderAddress?.toLowerCase() || "";
      return tx.includes(q) || trader.includes(q);
    });
  }, [trades, debouncedSearchQuery]);

  const chainLabelForTrade = (trade: DexTrade) =>
    availableChains.find((c) => c.id === trade.chainId)?.name ||
    String(trade.chainId);

  const getChainIconSrc = (trade: DexTrade) => {
    const iconByChainId: Record<number, string> = {
      1: "https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=029",
      10: "https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg?v=029",
      56: "https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=029",
      137: "https://cryptologos.cc/logos/polygon-matic-logo.svg?v=029",
      324: "https://icons.llamao.fi/icons/chains/rsz_zksync%20era.jpg",
      5000: "https://icons.llamao.fi/icons/chains/rsz_mantle.jpg",
      42161: "https://cryptologos.cc/logos/arbitrum-arb-logo.svg?v=029",
      43114: "https://cryptologos.cc/logos/avalanche-avax-logo.svg?v=029",
      8453: "https://icons.llamao.fi/icons/chains/rsz_base.jpg",
      25: "https://cryptologos.cc/logos/cronos-cro-logo.svg?v=029",
    };
    return iconByChainId[trade.chainId] || null;
  };

  const normalizeSymbol = (value: string | null | undefined) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const getQuoteDecimals = (trade: DexTrade) => {
    const symbol = normalizeSymbol(trade.quoteSymbol);
    if (!symbol) return 18;
    if (trade.chainId === 56 && symbol === "usdt") return 18;
    if (symbol === "usdc" || symbol === "usdt") return 6;
    return 18;
  };

  const formatDisplayNumber = (value: string, maximumFractionDigits = 6) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return value;
    return num.toLocaleString("en-US", { maximumFractionDigits });
  };

  const handleCopyTxHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedTxHash(hash);
      window.setTimeout(() => setCopiedTxHash(null), 1500);
    } catch (err) {
      console.error("Failed to copy tx hash:", err);
    }
  };

  const showDexTooltip = (key: string) => {
    setActiveDexTooltipKey(key);
    window.setTimeout(() => {
      setActiveDexTooltipKey((current) => (current === key ? null : current));
    }, 1600);
  };

  const handleSortToggle = () => {
    const next = sort === "asc" ? "desc" : "asc";
    setSort(next);
    setPage(1);
  };

  return (
    <div>
      <div
        id="dex-trades-title"
        className="flex items-center gap-3 mb-6 scroll-mt-24"
      >
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
          <Repeat className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DEX Trades</h1>
          <p className="text-sm text-gray-500">
            Derived from on-chain Swap events across supported chains
          </p>
        </div>
      </div>

      <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200 space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Latest DEX Trades
            </h3>
            <div className="flex flex-col xs:flex-row xs:items-center gap-2 sm:gap-3">
              <div className="flex gap-2 w-full xs:w-auto">
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="flex-1 xs:flex-none inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs sm:text-sm font-medium text-blue-600 transition-all hover:bg-blue-100 disabled:opacity-70"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
                  />
                  <span className="hidden xs:inline">
                    {isFetching ? "Refreshing..." : "Refresh"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportDexTradesToCSV(visibleTrades, chainName)
                  }
                  disabled={visibleTrades.length === 0}
                  className="flex-1 xs:flex-none inline-flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs sm:text-sm font-medium text-green-600 transition-all hover:bg-green-100 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden xs:inline">Export</span>
                </button>
              </div>
              {tradesData?.timestamp && (
                <span className="text-xs text-gray-500 text-center xs:text-left">
                  Updated{" "}
                  {timeAgo(String(Math.floor(tradesData.timestamp / 1000)))}
                </span>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 bg-gray-50 p-2 sm:p-3 rounded-lg">
            <label className="flex items-center gap-2">
              <span className="font-medium text-gray-500 whitespace-nowrap">
                Chain:
              </span>
              <select
                value={chainId}
                onChange={(e) => {
                  setChainId(Number(e.target.value));
                  setPage(1);
                }}
                className="flex-1 sm:flex-none rounded-md border-gray-300 text-xs sm:text-sm focus:ring-blue-500 focus:border-blue-500 py-1 px-2 bg-white"
              >
                {availableChains.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="font-medium text-gray-500 whitespace-nowrap">
                Rows:
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="flex-1 sm:flex-none rounded-md border-gray-300 text-xs sm:text-sm focus:ring-blue-500 focus:border-blue-500 py-1 px-2 bg-white"
              >
                {[10, 25, 50, 100].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="font-medium text-gray-500 whitespace-nowrap">
                Sort:
              </span>
              <button
                type="button"
                onClick={handleSortToggle}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs sm:text-sm hover:bg-gray-50"
              >
                {sort === "desc" ? (
                  <>
                    <ArrowDown className="w-3.5 h-3.5" />
                    Newest first
                  </>
                ) : (
                  <>
                    <ArrowUp className="w-3.5 h-3.5" />
                    Oldest first
                  </>
                )}
              </button>
            </label>

            <div className="relative flex-1 min-w-[180px]">
              <input
                type="text"
                placeholder="Search by trader / tx hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-3 text-xs sm:text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="ml-auto text-xs sm:text-sm text-gray-500 whitespace-nowrap hidden sm:block">
              {total.toLocaleString("en-US")} Trades
            </div>
          </div>
        </div>

        {/* Table */}
        <div>
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-500">
              Error loading trades: {error.message}
            </div>
          ) : visibleTrades.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No trades found.
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {visibleTrades.map((trade) => {
                  const chainLabel = chainLabelForTrade(trade);
                  const bzrAmountRaw = trade.amountBzrRaw || "0";
                  const quoteAmountRaw = trade.amountQuoteRaw || "0";
                  const quoteDecimals = getQuoteDecimals(trade);
                  const quoteSymbol = trade.quoteSymbol || "--";

                  const bzrAmount = formatValue(bzrAmountRaw, 18);
                  const quoteAmount = formatValue(quoteAmountRaw, quoteDecimals);

                  const tokenOut =
                    trade.side === "sell"
                      ? { amount: bzrAmount, symbol: "BZR" }
                      : trade.side === "buy"
                        ? { amount: quoteAmount, symbol: quoteSymbol }
                        : { amount: "--", symbol: "--" };
                  const tokenIn =
                    trade.side === "sell"
                      ? { amount: quoteAmount, symbol: quoteSymbol }
                      : trade.side === "buy"
                        ? { amount: bzrAmount, symbol: "BZR" }
                        : { amount: "--", symbol: "--" };

                  const bzrAmountNum = Number(bzrAmount);
                  const quoteAmountNum = Number(quoteAmount);
                  const swappedRate =
                    Number.isFinite(bzrAmountNum) &&
                    Number.isFinite(quoteAmountNum) &&
                    bzrAmountNum > 0
                      ? quoteAmountNum / bzrAmountNum
                      : null;

                  const swappedRateText =
                    swappedRate !== null && Number.isFinite(swappedRate)
                      ? `${formatDisplayNumber(swappedRate.toString(), 8)} ${quoteSymbol}`
                      : "--";

                  const swappedUsdText =
                    trade.priceUsd !== null && trade.priceUsd !== undefined
                      ? `($${trade.priceUsd.toFixed(2)})`
                      : "";

                  const valueUsd =
                    trade.valueUsd !== null && trade.valueUsd !== undefined
                      ? formatUsdValue(Number(trade.valueUsd))
                      : "--";
                  const age =
                    trade.timeStamp ? timeAgo(String(trade.timeStamp)) : "--";
                  const actionLabel =
                    trade.side === "buy"
                      ? "Buy"
                      : trade.side === "sell"
                        ? "Sell"
                        : "--";

                  const blockNumber =
                    trade.blockNumber !== null && trade.blockNumber !== undefined
                      ? Math.trunc(Number(trade.blockNumber)).toString()
                      : "--";

                  const tooltipKey = `${trade.chainId}-${trade.txHash}-${trade.logIndex}`;
                  const dexTooltipText = trade.dexId || "--";
                  const dexTooltipLabel = `${dexTooltipText} • ${chainLabel}`;
                  const chainIconSrc = getChainIconSrc(trade);

                  return (
                    <div
                      key={`${trade.chainId}-${trade.txHash}-${trade.logIndex}`}
                      className="p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <a
                            href={getExplorerUrl(chainLabel, trade.txHash, "tx")}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-blue-600 hover:underline"
                          >
                            {truncateHash(trade.txHash)}
                          </a>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            {blockNumber !== "--" ? (
                              <a
                                href={getExplorerBlockUrl(chainLabel, blockNumber)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-medium"
                              >
                                #{blockNumber}
                              </a>
                            ) : null}
                            <span className="whitespace-nowrap">{age}</span>
                            {trade.side ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  trade.side === "buy"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {actionLabel}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyTxHash(trade.txHash)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            title={
                              copiedTxHash === trade.txHash
                                ? "Copied"
                                : "Copy transaction hash"
                            }
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <a
                            href={getExplorerUrl(chainLabel, trade.txHash, "tx")}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            title="View transaction"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-gray-400">
                            Token Amount (Out)
                          </div>
                          <div className="mt-1 text-sm text-gray-900 whitespace-nowrap">
                            <span className="font-semibold">
                              {formatDisplayNumber(tokenOut.amount, 6)}
                            </span>{" "}
                            <span className="text-gray-500">
                              {tokenOut.symbol}
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0 text-right">
                          <div className="text-[11px] uppercase tracking-wide text-gray-400">
                            Token Amount (In)
                          </div>
                          <div className="mt-1 text-sm text-gray-900 whitespace-nowrap">
                            <span className="font-semibold">
                              {formatDisplayNumber(tokenIn.amount, 6)}
                            </span>{" "}
                            {tokenIn.symbol === "BZR" ? (
                              <span className="text-blue-600 whitespace-nowrap">
                                ERC-20: BZR
                              </span>
                            ) : (
                              <span className="text-gray-500 whitespace-nowrap">
                                {tokenIn.symbol}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-gray-400">
                            Swapped Rate
                          </div>
                          <div className="mt-1 text-sm text-gray-900 whitespace-nowrap">
                            <span className="font-semibold">
                              {swappedRateText}
                            </span>{" "}
                            <span className="text-gray-500">{swappedUsdText}</span>
                          </div>
                        </div>
                        <div className="min-w-0 text-right">
                          <div className="text-[11px] uppercase tracking-wide text-gray-400">
                            Txn Value ($)
                          </div>
                          <div className="mt-1 text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {valueUsd}
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-wide text-gray-400">
                              Network
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              {chainLabel}
                            </div>
                          </div>
                          <div className="relative inline-flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => showDexTooltip(tooltipKey)}
                              onBlur={() =>
                                setActiveDexTooltipKey((current) =>
                                  current === tooltipKey ? null : current
                                )
                              }
                              className="group relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              title={dexTooltipLabel}
                              aria-label={dexTooltipLabel}
                            >
                              {chainIconSrc ? (
                                <img
                                  src={chainIconSrc}
                                  alt={chainLabel}
                                  className="h-5 w-5 rounded-sm object-contain"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-xs font-semibold text-gray-700">
                                  {chainLabel.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                              <span
                                className={`pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg ${
                                  activeDexTooltipKey === tooltipKey
                                    ? "block"
                                    : "hidden group-hover:block group-focus:block"
                                }`}
                              >
                                {dexTooltipText}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full table-fixed divide-y divide-gray-200 text-xs sm:text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-2 py-3 text-left w-12"></th>
                      <th className="px-2 sm:px-3 py-3 text-left w-40 sm:w-44 lg:w-52">
                        Transaction Hash
                      </th>
                      <th className="hidden md:table-cell px-2 sm:px-3 py-3 text-left w-24">
                        Block
                      </th>
                      <th className="px-2 sm:px-3 py-3 text-left w-24 sm:w-28">
                        Age
                      </th>
                      <th className="px-2 sm:px-3 py-3 text-left w-20">
                        Action
                      </th>
                      <th className="hidden sm:table-cell px-2 sm:px-3 py-3 text-right w-36 lg:w-40">
                        Token Amount (Out)
                      </th>
                      <th className="hidden sm:table-cell px-2 sm:px-3 py-3 text-right w-36 lg:w-40">
                        Token Amount (In)
                      </th>
                      <th className="hidden xl:table-cell px-2 sm:px-3 py-3 text-right w-40">
                        Swapped Rate
                      </th>
                      <th className="px-2 sm:px-3 py-3 text-right w-24">
                        Txn Value ($)
                      </th>
                      <th className="px-2 sm:px-3 py-3 text-center w-14">
                        DEX
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleTrades.map((trade) => {
                      const chainLabel = chainLabelForTrade(trade);
                      const bzrAmountRaw = trade.amountBzrRaw || "0";
                      const quoteAmountRaw = trade.amountQuoteRaw || "0";
                      const quoteDecimals = getQuoteDecimals(trade);
                      const quoteSymbol = trade.quoteSymbol || "--";

                      const bzrAmount = formatValue(bzrAmountRaw, 18);
                      const quoteAmount = formatValue(
                        quoteAmountRaw,
                        quoteDecimals
                      );

                      const tokenOut =
                        trade.side === "sell"
                          ? { amount: bzrAmount, symbol: "BZR" }
                          : trade.side === "buy"
                            ? { amount: quoteAmount, symbol: quoteSymbol }
                            : { amount: "--", symbol: "--" };
                      const tokenIn =
                        trade.side === "sell"
                          ? { amount: quoteAmount, symbol: quoteSymbol }
                          : trade.side === "buy"
                            ? { amount: bzrAmount, symbol: "BZR" }
                            : { amount: "--", symbol: "--" };

                      const bzrAmountNum = Number(bzrAmount);
                      const quoteAmountNum = Number(quoteAmount);
                      const swappedRate =
                        Number.isFinite(bzrAmountNum) &&
                        Number.isFinite(quoteAmountNum) &&
                        bzrAmountNum > 0
                          ? quoteAmountNum / bzrAmountNum
                          : null;

                      const swappedRateText =
                        swappedRate !== null && Number.isFinite(swappedRate)
                          ? `${formatDisplayNumber(swappedRate.toString(), 8)} ${quoteSymbol}`
                          : "--";

                      const swappedUsdText =
                        trade.priceUsd !== null && trade.priceUsd !== undefined
                          ? `($${trade.priceUsd.toFixed(2)})`
                          : "";

                      const valueUsd =
                        trade.valueUsd !== null && trade.valueUsd !== undefined
                          ? formatUsdValue(Number(trade.valueUsd))
                          : "--";
                      const age =
                        trade.timeStamp
                          ? timeAgo(String(trade.timeStamp))
                          : "--";
                      const actionLabel =
                        trade.side === "buy"
                          ? "Buy"
                          : trade.side === "sell"
                            ? "Sell"
                            : "--";
                      const blockNumber =
                        trade.blockNumber !== null &&
                        trade.blockNumber !== undefined
                          ? Math.trunc(Number(trade.blockNumber)).toString()
                          : "--";
                      const tooltipKey = `${trade.chainId}-${trade.txHash}-${trade.logIndex}`;
                      const dexTooltipText = trade.dexId || "--";
                      const dexTooltipLabel = `${dexTooltipText} • ${chainLabel}`;
                      const chainIconSrc = getChainIconSrc(trade);

                      return (
                        <tr
                          key={`${trade.chainId}-${trade.txHash}-${trade.logIndex}`}
                        >
                          <td className="px-2 sm:px-3 py-3">
                            <a
                              href={getExplorerUrl(
                                chainLabel,
                                trade.txHash,
                                "tx"
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                              title="View transaction"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          </td>
                          <td className="px-2 sm:px-4 py-3">
                            <div className="flex items-center gap-2">
                              <a
                                href={getExplorerUrl(
                                  chainLabel,
                                  trade.txHash,
                                  "tx"
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-mono truncate max-w-[9rem] sm:max-w-[10rem] lg:max-w-[12rem]"
                              >
                                {truncateHash(trade.txHash)}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyTxHash(trade.txHash)}
                                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                title={
                                  copiedTxHash === trade.txHash
                                    ? "Copied"
                                    : "Copy transaction hash"
                                }
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-2 sm:px-3 py-3">
                            {blockNumber !== "--" ? (
                              <a
                                href={getExplorerBlockUrl(
                                  chainLabel,
                                  blockNumber
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-medium"
                              >
                                {blockNumber}
                              </a>
                            ) : (
                              <span className="text-gray-500">--</span>
                            )}
                          </td>
                          <td className="px-2 sm:px-3 py-3 text-gray-700 whitespace-nowrap">
                            {age}
                          </td>
                          <td className="px-2 sm:px-3 py-3">
                            {trade.side ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  trade.side === "buy"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {actionLabel}
                              </span>
                            ) : (
                              "--"
                            )}
                          </td>
                          <td className="hidden sm:table-cell px-2 sm:px-3 py-3 text-right text-gray-700 whitespace-nowrap">
                            <span className="font-medium text-gray-900">
                              {formatDisplayNumber(tokenOut.amount, 8)}
                            </span>{" "}
                            <span className="text-gray-500">
                              {tokenOut.symbol}
                            </span>
                          </td>
                          <td className="hidden sm:table-cell px-2 sm:px-3 py-3 text-right text-gray-700 whitespace-nowrap">
                            <span className="font-medium text-gray-900">
                              {formatDisplayNumber(tokenIn.amount, 8)}
                            </span>{" "}
                            {tokenIn.symbol === "BZR" ? (
                              <span className="text-blue-600">ERC-20: BZR</span>
                            ) : (
                              <span className="text-gray-500">
                                {tokenIn.symbol}
                              </span>
                            )}
                          </td>
                          <td className="hidden xl:table-cell px-2 sm:px-3 py-3 text-right text-gray-700 whitespace-nowrap">
                            <span className="font-medium text-gray-900">
                              {swappedRateText}
                            </span>{" "}
                            <span className="text-gray-500">
                              {swappedUsdText}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-3 text-right text-gray-700 whitespace-nowrap">
                            {valueUsd}
                          </td>
                          <td className="px-2 sm:px-3 py-3 text-center">
                            <div className="relative inline-flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => showDexTooltip(tooltipKey)}
                                onBlur={() =>
                                  setActiveDexTooltipKey((current) =>
                                    current === tooltipKey ? null : current
                                  )
                                }
                                className="group relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title={dexTooltipLabel}
                                aria-label={dexTooltipLabel}
                              >
                                {chainIconSrc ? (
                                  <img
                                    src={chainIconSrc}
                                    alt={chainLabel}
                                    className="h-5 w-5 rounded-sm object-contain"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-xs font-semibold text-gray-700">
                                    {chainLabel.slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                                <span
                                  className={`pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg ${
                                    activeDexTooltipKey === tooltipKey
                                      ? "block"
                                      : "hidden group-hover:block group-focus:block"
                                  }`}
                                >
                                  {dexTooltipText}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Pagination footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 flex flex-col xs:flex-row items-center justify-between bg-gray-50 gap-2">
          <div className="text-xs sm:text-sm text-gray-600">
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of{" "}
            {total.toLocaleString("en-US")}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1 || isFetching}
              className="px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs sm:text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages || isFetching}
              className="px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
