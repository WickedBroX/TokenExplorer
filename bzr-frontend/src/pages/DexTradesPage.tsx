import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Download, RefreshCw, Repeat } from "lucide-react";
import { useDexTrades } from "../hooks/api/useDexTrades";
import { useTransfers } from "../hooks/api/useTransfers";
import { LoadingSpinner } from "../components";
import { exportDexTradesToCSV } from "../utils/exportUtils";
import {
  formatUsdValue,
  formatValue,
  getExplorerUrl,
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
  const availableChains = [
    { id: 0, name: "All Chains" },
    ...(transfersData?.availableChains || []).filter((c) => c.id !== 0),
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
        <div className="overflow-x-auto">
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
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left w-12">Rank</th>
                  <th className="px-4 py-3 text-left">Tx Hash</th>
                  <th className="px-4 py-3 text-left">Age</th>
                  <th className="px-4 py-3 text-left">Trader</th>
                  <th className="px-4 py-3 text-left">Side</th>
                  <th className="px-4 py-3 text-right">Quantity (BZR)</th>
                  <th className="px-4 py-3 text-right">Price (USD)</th>
                  <th className="px-4 py-3 text-right">Value (USD)</th>
                  <th className="px-4 py-3 text-left">Chain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleTrades.map((trade, index) => {
                  const rank = (page - 1) * pageSize + index + 1;
                  const chainLabel = chainLabelForTrade(trade);
                  const quantity = trade.amountBzrRaw
                    ? formatValue(trade.amountBzrRaw, 18)
                    : "0";
                  const priceUsd =
                    trade.priceUsd !== null && trade.priceUsd !== undefined
                      ? `$${trade.priceUsd.toFixed(4)}`
                      : "--";
                  const valueUsd =
                    trade.valueUsd !== null && trade.valueUsd !== undefined
                      ? formatUsdValue(Number(trade.valueUsd))
                      : "--";
                  const age =
                    trade.timeStamp ? timeAgo(String(trade.timeStamp)) : "--";

                  return (
                    <tr key={`${trade.chainId}-${trade.txHash}-${trade.logIndex}`}>
                      <td className="px-4 py-3 text-gray-500 font-mono">
                        {rank}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={getExplorerUrl(chainLabel, trade.txHash, "tx")}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-mono"
                        >
                          {truncateHash(trade.txHash)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {age}
                      </td>
                      <td className="px-4 py-3">
                        {trade.traderAddress ? (
                          <Link
                            to={`/address/${trade.traderAddress}`}
                            className="text-blue-600 hover:underline font-mono"
                          >
                            {truncateHash(trade.traderAddress)}
                          </Link>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {trade.side ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              trade.side === "buy"
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {trade.side.toUpperCase()}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                        {Number(quantity).toLocaleString("en-US", {
                          maximumFractionDigits: 6,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                        {priceUsd}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                        {valueUsd}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {chainLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
