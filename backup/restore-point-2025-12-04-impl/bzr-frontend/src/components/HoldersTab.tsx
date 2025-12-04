import React, { useState } from "react";
import { Search, Download, Copy, Check, RefreshCw } from "lucide-react";
import type { Holder } from "../types/api";

interface HoldersTabProps {
  holders: Holder[];
  holdersChainId: number;
  holdersPage: number;
  holdersPageSize: number;
  loadingHolders: boolean;
  holdersError: Error | { message: string } | null;
  holderSearch: string;
  tokenPrice: { priceUsd: number | null } | null;
  availableChains: Array<{ id: number; name: string }>;
  setHoldersChainId: (id: number) => void;
  setHoldersPageSize: (size: number) => void;
  setHolderSearch: (search: string) => void;
  refreshHolders: () => void;
  exportHoldersToCSV: (holders: Holder[], chainName: string) => void;
  getExplorerUrl: (
    chainName: string,
    address: string,
    type: "tx" | "address"
  ) => string;
  truncateHash: (hash: string, start?: number, end?: number) => string;
  formatUsdValue: (value: number) => string;
}

export const HoldersTab: React.FC<HoldersTabProps> = ({
  holders,
  holdersChainId,
  holdersPage,
  holdersPageSize,
  loadingHolders,
  holdersError,
  holderSearch,
  tokenPrice,
  availableChains,
  setHoldersChainId,
  setHoldersPageSize,
  setHolderSearch,
  refreshHolders,
  exportHoldersToCSV,
  getExplorerUrl,
  truncateHash,
  formatUsdValue,
}) => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const chainName =
    availableChains.find((c) => c.id === holdersChainId)?.name ||
    "Unknown Chain";

  // Filter client-side if search is active
  const filteredHolders = holders.filter((holder) =>
    holder.TokenHolderAddress.toLowerCase().includes(holderSearch.toLowerCase())
  );

  // Sort by balance (highest to lowest)
  const sortedHolders = [...filteredHolders].sort((a, b) => {
    const balanceA = parseFloat(a.TokenHolderQuantity);
    const balanceB = parseFloat(b.TokenHolderQuantity);
    return balanceB - balanceA;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Content Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
          {/* Search & Chain */}
          <div className="flex flex-col sm:flex-row flex-1 gap-2 sm:gap-3">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by address..."
                value={holderSearch}
                onChange={(e) => setHolderSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={holdersChainId}
              onChange={(e) => setHoldersChainId(Number(e.target.value))}
              className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
              {availableChains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="hidden sm:flex items-center px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-600 whitespace-nowrap">
              <span className="font-medium text-gray-900 mr-1">
                {filteredHolders.length}
              </span>{" "}
              {holderSearch ? (
                <span className="flex items-center gap-1">
                  <span>Filtered</span>
                  <span className="text-gray-400">
                    ({holders.length} total)
                  </span>
                </span>
              ) : (
                <span>Holders Loaded</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={refreshHolders}
              disabled={loadingHolders}
              className="flex-1 sm:flex-none p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh List"
            >
              <RefreshCw
                className={`w-4 h-4 ${loadingHolders ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={() => exportHoldersToCSV(sortedHolders, chainName)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>

        {/* Mobile stacked cards (visible on small screens) */}
        <div className="block md:hidden">
          <div className="divide-y divide-gray-100">
            {loadingHolders ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 animate-pulse bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="h-4 w-12 bg-gray-200 rounded"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  </div>
                  <div className="mt-3 h-4 w-full bg-gray-200 rounded"></div>
                </div>
              ))
            ) : holdersError ? (
              <div className="p-4 text-sm text-red-500 text-center bg-white">
                Error loading holders:{" "}
                {typeof holdersError === "string"
                  ? holdersError
                  : holdersError.message}
              </div>
            ) : sortedHolders.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center bg-white">
                No holders found matching your criteria.
              </div>
            ) : (
              sortedHolders.map((holder, index) => {
                const balance = parseFloat(holder.TokenHolderQuantity) / 1e18;
                const valueUsd = tokenPrice?.priceUsd
                  ? balance * tokenPrice.priceUsd
                  : 0;
                const rank = (holdersPage - 1) * holdersPageSize + index + 1;

                return (
                  <div key={holder.TokenHolderAddress} className="p-3 bg-white">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="text-gray-500 font-mono text-xs flex-shrink-0">
                            #{rank}
                          </div>
                          <a
                            href={getExplorerUrl(
                              holder.chainName || chainName,
                              holder.TokenHolderAddress,
                              "address"
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 font-mono hover:text-blue-800 hover:underline truncate text-sm min-w-0"
                          >
                            {truncateHash(holder.TokenHolderAddress)}
                          </a>
                          <button
                            onClick={() =>
                              handleCopyAddress(holder.TokenHolderAddress)
                            }
                            className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                          >
                            {copiedAddress === holder.TokenHolderAddress ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 ml-0">
                          {holder.chainName || chainName}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-medium text-gray-900 text-sm whitespace-nowrap">
                          {balance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-xs text-gray-600 whitespace-nowrap">
                          {formatUsdValue(valueUsd)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Table (desktop) */}
        <div className="hidden md:block overflow-x-auto -mx-px">
          <table className="w-full text-xs sm:text-sm text-left min-w-[480px]">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 w-12 sm:w-16">Rank</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3">Address</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3">Chain</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-right">
                  Quantity
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingHolders ? (
                // Skeleton Loader
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="h-4 w-6 sm:w-8 bg-gray-200 rounded"></div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="h-4 w-32 sm:w-48 bg-gray-200 rounded"></div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="h-4 w-20 sm:w-24 bg-gray-200 rounded ml-auto"></div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="h-4 w-16 sm:w-20 bg-gray-200 rounded ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : holdersError ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 sm:px-6 py-8 sm:py-12 text-center text-sm text-red-500"
                  >
                    Error loading holders:{" "}
                    {typeof holdersError === "string"
                      ? holdersError
                      : holdersError.message}
                  </td>
                </tr>
              ) : sortedHolders.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 sm:px-6 py-8 sm:py-12 text-center text-sm text-gray-500"
                  >
                    No holders found matching your criteria.
                  </td>
                </tr>
              ) : (
                sortedHolders.map((holder, index) => {
                  const balance = parseFloat(holder.TokenHolderQuantity) / 1e18;
                  const valueUsd = tokenPrice?.priceUsd
                    ? balance * tokenPrice.priceUsd
                    : 0;
                  const rank = (holdersPage - 1) * holdersPageSize + index + 1;

                  return (
                    <tr
                      key={holder.TokenHolderAddress}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-500 font-mono text-xs sm:text-sm">
                        {rank}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <a
                            href={getExplorerUrl(
                              holder.chainName || chainName,
                              holder.TokenHolderAddress,
                              "address"
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 font-mono hover:text-blue-800 hover:underline truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[200px] text-xs sm:text-sm"
                          >
                            {truncateHash(holder.TokenHolderAddress)}
                          </a>
                          <button
                            onClick={() =>
                              handleCopyAddress(holder.TokenHolderAddress)
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                          >
                            {copiedAddress === holder.TokenHolderAddress ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-700 text-xs sm:text-sm">
                        {holder.chainName || chainName}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-medium text-gray-900 text-xs sm:text-sm whitespace-nowrap">
                        {balance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-gray-600 text-xs sm:text-sm whitespace-nowrap">
                        {formatUsdValue(valueUsd)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 flex flex-col xs:flex-row items-center justify-between bg-gray-50 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-600">Show</span>
            <select
              value={holdersPageSize}
              onChange={(e) => setHoldersPageSize(Number(e.target.value))}
              className="text-xs sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 py-1"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs sm:text-sm text-gray-600">per page</span>
          </div>
        </div>
      </div>
    </div>
  );
};
