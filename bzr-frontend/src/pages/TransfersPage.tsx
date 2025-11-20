import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Download,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { useTransfers } from "../hooks/api/useTransfers";
import { LoadingSpinner } from "../components";
import { TransactionModal } from "../components/TransactionModal";
import { exportTransfersToCSV } from "../utils/exportUtils";
import {
  timeAgo,
  formatValue,
  getExplorerUrl,
  truncateHash,
} from "../utils/formatters";
import type { Transfer } from "../types/api";

export const TransfersPage: React.FC = () => {
  const [urlSearchParams] = useSearchParams();

  const [chainId, setChainId] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<"asc" | "desc">("desc");

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transfer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Smart search: auto-detect if input is address, block, or tx hash
  const getSearchParams = (query: string) => {
    if (!query.trim()) {
      return { address: undefined, block: undefined, hash: undefined };
    }

    const trimmed = query.trim();

    // Transaction hash: starts with 0x and is 66 characters long
    if (trimmed.startsWith("0x") && trimmed.length === 66) {
      return { address: undefined, block: undefined, hash: trimmed };
    }

    // Address: starts with 0x and is 42 characters long
    if (trimmed.startsWith("0x") && trimmed.length === 42) {
      return { address: trimmed, block: undefined, hash: undefined };
    }

    // Block number: all numeric digits
    if (/^\d+$/.test(trimmed)) {
      return { address: undefined, block: trimmed, hash: undefined };
    }

    // Partial address or uncertain - treat as address
    if (trimmed.startsWith("0x")) {
      return { address: trimmed, block: undefined, hash: undefined };
    }

    // Default: treat as address
    return { address: trimmed, block: undefined, hash: undefined };
  };

  const searchParams = getSearchParams(searchQuery);

  // Auto-scroll to transfers section when search params are present
  useEffect(() => {
    if (searchParams.address || searchParams.block || searchParams.hash) {
      // Small timeout to ensure DOM is ready and data fetching has started
      setTimeout(() => {
        const element = document.getElementById("transfers-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [searchParams.address, searchParams.block, searchParams.hash]);

  // Sync URL params to state
  useEffect(() => {
    const addr = urlSearchParams.get("address");
    const block = urlSearchParams.get("block");
    const hash = urlSearchParams.get("hash");

    if (addr) setSearchQuery(addr);
    else if (block) setSearchQuery(block);
    else if (hash) setSearchQuery(hash);
  }, [urlSearchParams]);

  const { data, isLoading, isFetching, refetch } = useTransfers({
    chainId,
    page,
    pageSize,
    sort,
    address: searchParams.address,
    block: searchParams.block,
    hash: searchParams.hash,
  });

  const transfers = data?.data || [];
  const meta = data?.meta;
  const totalFromMeta = meta?.total ?? transfers.length;
  const totalPagesFromMeta =
    meta?.totalPages ??
    (totalFromMeta > 0 ? Math.ceil(totalFromMeta / pageSize) : 1);

  const transfersPagination = {
    page: meta?.page ?? page,
    totalPages: totalPagesFromMeta,
    total: totalFromMeta,
  };
  const availableChains = data?.availableChains || [];
  const lastUpdated = data?.timestamp;

  // Filter logic - Client side filtering is no longer needed as we pass params to API
  // But we keep it for immediate feedback if needed, or just rely on API.
  // The original code filtered `transfers` which was from API.
  // Since we pass filters to API, the returned `transfers` are already filtered.
  const visibleTransfers = transfers;

  // Pagination helpers
  const currentPage = transfersPagination?.page || 1;
  const totalPages = transfersPagination?.totalPages || 1;
  const totalRecords = transfersPagination?.total;
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const showingStart = (currentPage - 1) * pageSize + 1;
  const showingEnd = Math.min(currentPage * pageSize, totalRecords || 0);

  // Sorting helpers
  const handleSort = () => {
    const newDirection = sort === "asc" ? "desc" : "asc";
    setTransfersSort(newDirection);
  };

  const sortDirection = sort;
  const sortColumn = "age"; // Default for now

  const chainOptions = availableChains; // Backend already includes "All Chains"
  const pageSizeOptions = [10, 25, 50, 100];

  const setTransfersChain = (id: number) => {
    setChainId(id);
    setPage(1);
  };

  const setTransfersPage = (p: number) => setPage(p);
  const setTransfersPageSize = (s: number) => {
    setPageSize(s);
    setPage(1);
  };

  const setTransfersSort = (newSort: "asc" | "desc") => {
    setSort(newSort);
    setPage(1);
  };

  return (
    <div>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg text-blue-600">
          <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Transfers
        </h1>
      </div>

      <div
        id="transfers-section"
        className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200"
      >
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200 space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Latest Aggregated Transfers
            </h3>
            <div className="flex flex-col xs:flex-row xs:items-center gap-2 sm:gap-3">
              <div className="flex gap-2 w-full xs:w-auto">
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className={`flex-1 xs:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-blue-600 transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <svg
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                      isFetching ? "animate-spin" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="hidden xs:inline">
                    {isFetching ? "Refreshing..." : "Refresh"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => exportTransfersToCSV(visibleTransfers)}
                  disabled={visibleTransfers.length === 0}
                  className={`flex-1 xs:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-green-200 bg-green-50 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-green-600 transition-all hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Export</span>
                </button>
              </div>
              {lastUpdated && (
                <span className="text-xs text-gray-500 text-center xs:text-left">
                  Updated {timeAgo(String(Math.floor(lastUpdated / 1000)))}
                </span>
              )}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 bg-gray-50 p-2 sm:p-3 rounded-lg">
            <label className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-medium text-gray-500 whitespace-nowrap">
                Chain:
              </span>
              <select
                value={chainId}
                onChange={(e) => setTransfersChain(Number(e.target.value))}
                className="flex-1 sm:flex-none rounded-md border-gray-300 text-xs sm:text-sm focus:ring-blue-500 focus:border-blue-500 py-1 px-2"
              >
                {chainOptions.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-medium text-gray-500 whitespace-nowrap">
                Rows:
              </span>
              <select
                value={pageSize}
                onChange={(e) => setTransfersPageSize(Number(e.target.value))}
                className="flex-1 sm:flex-none rounded-md border-gray-300 text-xs sm:text-sm focus:ring-blue-500 focus:border-blue-500 py-1 px-2"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-medium text-gray-500 whitespace-nowrap">
                Sort:
              </span>
              <select
                value={sort}
                onChange={(e) =>
                  setTransfersSort(e.target.value as "asc" | "desc")
                }
                className="flex-1 sm:flex-none rounded-md border-gray-300 text-xs sm:text-sm focus:ring-blue-500 focus:border-blue-500 py-1 px-2"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>

            <div className="flex-1 min-w-full sm:min-w-[250px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
                placeholder="Search by address, block number, or tx hash..."
                className="w-full rounded-md border-gray-300 text-xs sm:text-sm focus:ring-blue-500 focus:border-blue-500 py-1 px-2"
              />
              {searchQuery && (
                <div className="text-xs text-gray-500 mt-1">
                  {searchParams.hash && "🔍 Searching by transaction hash"}
                  {searchParams.address && "🔍 Searching by address"}
                  {searchParams.block &&
                    `🔍 Searching in block #${searchParams.block}`}
                </div>
              )}
            </div>

            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="text-red-600 hover:text-red-800 text-xs font-medium whitespace-nowrap px-2 py-1"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {isLoading && transfers.length === 0 ? (
          <div className="py-12 sm:py-16">
            <LoadingSpinner />
          </div>
        ) : visibleTransfers.length > 0 ? (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {visibleTransfers.map((tx, index) => (
                <div
                  key={tx.hash}
                  className={`p-4 cursor-pointer transition-colors hover:bg-blue-50 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                  onClick={() => setSelectedTransaction(tx)}
                >
                  {/* Header Row - Hash and Method */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Box className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <a
                        href={getExplorerUrl(tx.chainName, tx.hash, "tx")}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-mono text-blue-600 hover:underline truncate"
                      >
                        {truncateHash(tx.hash, 6, 4)}
                      </a>
                    </div>
                    {tx.functionName && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 flex-shrink-0">
                        {tx.functionName.split("(")[0]}
                      </span>
                    )}
                  </div>

                  {/* Value and Chain Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Value</div>
                      <div className="text-base font-bold text-gray-900">
                        {formatValue(tx.value, Number(tx.tokenDecimal) || 18)}{" "}
                        {tx.tokenSymbol}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                        {tx.chainName ?? ""}
                      </span>
                      <span className="text-xs text-gray-500">
                        {timeAgo(tx.timeStamp)}
                      </span>
                    </div>
                  </div>

                  {/* From/To Addresses */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-12 flex-shrink-0">
                        From:
                      </span>
                      <a
                        href={getExplorerUrl(tx.chainName, tx.from, "address")}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-mono text-blue-600 hover:underline truncate flex-1"
                      >
                        {truncateHash(tx.from, 8, 6)}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-12 flex-shrink-0">
                        To:
                      </span>
                      <a
                        href={getExplorerUrl(tx.chainName, tx.to, "address")}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-mono text-blue-600 hover:underline truncate flex-1"
                      >
                        {truncateHash(tx.to, 8, 6)}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto -mx-px">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      Tx Hash
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                      onClick={() => handleSort()}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className={
                            sortColumn === "age"
                              ? "text-blue-600"
                              : "text-gray-600"
                          }
                        >
                          Age
                        </span>
                        {sortColumn === "age" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      From
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      To
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      Chain
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleTransfers.map((tx, index) => (
                    <tr
                      key={tx.hash}
                      className={`group cursor-pointer transition-colors ${
                        index % 2 === 0
                          ? "bg-white hover:bg-blue-50"
                          : "bg-gray-50 hover:bg-blue-50"
                      }`}
                      onClick={() => setSelectedTransaction(tx)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        {tx.functionName ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            {tx.functionName.split("(")[0]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                          <a
                            href={getExplorerUrl(tx.chainName, tx.hash, "tx")}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-mono text-blue-600 hover:underline truncate"
                          >
                            {truncateHash(tx.hash, 8, 6)}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {timeAgo(tx.timeStamp)}
                      </td>
                      <td className="px-4 py-4">
                        <a
                          href={getExplorerUrl(
                            tx.chainName,
                            tx.from,
                            "address"
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-mono text-blue-600 hover:underline truncate block"
                        >
                          {truncateHash(tx.from)}
                        </a>
                      </td>
                      <td className="px-4 py-4">
                        <a
                          href={getExplorerUrl(tx.chainName, tx.to, "address")}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-mono text-blue-600 hover:underline truncate block"
                        >
                          {truncateHash(tx.to)}
                        </a>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatValue(tx.value, Number(tx.tokenDecimal) || 18)}{" "}
                          {tx.tokenSymbol}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                          {tx.chainName ?? ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-xs sm:text-sm text-gray-600 text-center lg:text-left">
                Showing {showingStart.toLocaleString()} –{" "}
                {showingEnd.toLocaleString()} of{" "}
                {totalRecords?.toLocaleString() || "many"} transfers
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => canGoPrev && setTransfersPage(currentPage - 1)}
                  disabled={!canGoPrev || isLoading}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg text-xs sm:text-sm font-medium disabled:opacity-50 bg-white hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => canGoNext && setTransfersPage(currentPage + 1)}
                  disabled={!canGoNext || isLoading}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg text-xs sm:text-sm font-medium disabled:opacity-50 bg-white hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 sm:p-12 text-center text-sm sm:text-base text-gray-500">
            No transfers found matching your criteria.
          </div>
        )}
      </div>

      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
};
