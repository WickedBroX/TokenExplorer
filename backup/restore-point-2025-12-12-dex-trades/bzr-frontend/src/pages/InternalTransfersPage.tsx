import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  Search as SearchIcon,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from "lucide-react";
import { useInternalTransfers } from "../hooks/api/useInternalTransfers";
import { LoadingSpinner } from "../components";
import {
  timeAgo,
  formatValue,
  getExplorerUrl,
  truncateHash,
} from "../utils/formatters";
import type { InternalTransfer } from "../types/api";

export const InternalTransfersPage: React.FC = () => {
  const [chainId, setChainId] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  const trimmedSearch = debouncedSearchQuery.trim();
  const isFullAddress =
    trimmedSearch.startsWith("0x") && trimmedSearch.length === 42;
  const apiAddress = isFullAddress ? trimmedSearch : undefined;
  const localFilter = !isFullAddress ? trimmedSearch.toLowerCase() : "";

  const { data, isLoading, isFetching, refetch } = useInternalTransfers({
    chainId,
    page,
    pageSize,
    sort,
    address: apiAddress,
  });

  const internalTransfers = data?.data || [];
  const meta = data?.meta;
  const chainOptions = data?.availableChains || [];

  const visibleTransfers = useMemo(() => {
    if (!localFilter) return internalTransfers;
    return internalTransfers.filter((tx) => {
      return (
        tx.hash.toLowerCase().includes(localFilter) ||
        tx.from.toLowerCase().includes(localFilter) ||
        tx.to.toLowerCase().includes(localFilter) ||
        tx.blockNumber.toLowerCase().includes(localFilter)
      );
    });
  }, [internalTransfers, localFilter]);

  const totalFromMeta = meta?.total ?? internalTransfers.length;
  const totalPages =
    meta?.totalPages ??
    (totalFromMeta > 0 ? Math.ceil(totalFromMeta / pageSize) : 1);

  const canGoPrev = page > 1;
  const canGoNext =
    typeof meta?.hasMore === "boolean" ? meta.hasMore : page < totalPages;

  const handleSortToggle = () => {
    setSort((prev) => (prev === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  const sortIcon =
    sort === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5" />
    ) : sort === "desc" ? (
      <ArrowDown className="w-3.5 h-3.5" />
    ) : (
      <ArrowUpDown className="w-3.5 h-3.5" />
    );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div
        id="internal-transfers-title"
        className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 scroll-mt-24"
      >
        <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg text-blue-600">
          <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Internal Transactions
        </h1>
      </div>

      <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200 space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Latest Internal Transfers
            </h3>
            <div className="flex flex-col xs:flex-row xs:items-center gap-2 sm:gap-3">
              <div className="flex gap-2 w-full xs:w-auto">
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="flex-1 xs:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs sm:text-sm font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-70"
                >
                  <svg
                    className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
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
                  <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportInternalToCSV(visibleTransfers)}
                  disabled={visibleTransfers.length === 0}
                  className="flex-1 xs:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs sm:text-sm font-medium text-green-600 hover:bg-green-100 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filters bar */}
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
                className="flex-1 sm:flex-none rounded-md border-gray-300 text-xs sm:text-sm focus:ring-blue-500 focus:border-blue-500 py-1 px-2"
              >
                {chainOptions.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
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
                className="flex-1 sm:flex-none rounded-md border-gray-300 text-xs sm:text-sm focus:ring-blue-500 focus:border-blue-500 py-1 px-2"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
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
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
              >
                {sortIcon}
                {sort === "desc" ? "Newest first" : "Oldest first"}
              </button>
            </label>

            <div className="relative flex-1 sm:min-w-[260px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by address, block, or tx hash..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left min-w-[720px]">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3">Txn Hash</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3">Age</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3">From</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3">To</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-right">
                  Value (BZR)
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3">Chain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleTransfers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 sm:px-6 py-8 text-center text-gray-500"
                  >
                    {data?.warnings?.length
                      ? data.warnings.map((w) => w.message).join(" ")
                      : "No internal transfers found."}
                  </td>
                </tr>
              ) : (
                visibleTransfers.map((tx: InternalTransfer) => (
                  <tr key={`${tx.chainId}-${tx.hash}`} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-3 font-mono">
                      <a
                        href={getExplorerUrl(tx.chainName, tx.hash, "tx")}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {truncateHash(tx.hash)}
                      </a>
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-gray-700 whitespace-nowrap">
                      {timeAgo(tx.timeStamp)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 font-mono">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/address/${tx.from}`}
                          className="text-blue-600 hover:underline"
                        >
                          {truncateHash(tx.from)}
                        </Link>
                        <a
                          href={getExplorerUrl(tx.chainName, tx.from, "address")}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                          aria-label="Open from address in explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 font-mono">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/address/${tx.to}`}
                          className="text-blue-600 hover:underline"
                        >
                          {truncateHash(tx.to)}
                        </Link>
                        <a
                          href={getExplorerUrl(tx.chainName, tx.to, "address")}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                          aria-label="Open to address in explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-right font-medium whitespace-nowrap">
                      {formatValue(tx.value, 18)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-gray-700">
                      {tx.chainName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 sm:p-4 border-t border-gray-200 flex flex-col xs:flex-row items-center justify-between bg-gray-50 gap-2">
          <div className="text-xs sm:text-sm text-gray-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => canGoPrev && setPage(page - 1)}
              disabled={!canGoPrev}
              className="px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => canGoNext && setPage(page + 1)}
              disabled={!canGoNext}
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

const exportInternalToCSV = (rows: InternalTransfer[]) => {
  if (!rows.length) return;
  const headers = ["Txn Hash", "Age", "From", "To", "Value (BZR)", "Chain"];

  const escape = (value: string) =>
    value.includes(",") || value.includes('"')
      ? `"${value.replace(/"/g, '""')}"`
      : value;

  const csv = [
    headers.join(","),
    ...rows.map((tx) =>
      [
        escape(tx.hash),
        escape(timeAgo(tx.timeStamp)),
        escape(tx.from),
        escape(tx.to),
        escape(formatValue(tx.value, 18)),
        escape(tx.chainName),
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `bzr-internal-transfers-${Date.now()}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
