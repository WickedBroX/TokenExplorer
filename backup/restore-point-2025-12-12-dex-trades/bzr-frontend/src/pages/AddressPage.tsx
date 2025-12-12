import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  User,
  Copy,
  Check,
  ExternalLink,
  ArrowRightLeft,
  Layers,
} from "lucide-react";
import { useAddressDetails } from "../hooks/api/useAddressDetails";
import { useInternalTransfers } from "../hooks/api/useInternalTransfers";
import { LoadingSpinner } from "../components";
import {
  formatValue,
  timeAgo,
  truncateHash,
  getExplorerUrl,
} from "../utils/formatters";

export const AddressPage: React.FC = () => {
  const { address = "" } = useParams();
  const normalizedAddress = address.trim();
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(normalizedAddress);

  // Ensure the address detail view starts at the top when navigating from long lists,
  // especially on mobile where browsers may retain scroll position.
  useEffect(() => {
    const titleEl = document.getElementById("address-title");
    if (titleEl) {
      titleEl.scrollIntoView({ behavior: "auto", block: "start" });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [normalizedAddress]);

  const { data, isLoading, error } = useAddressDetails(
    isValidAddress ? normalizedAddress : ""
  );

  const [activeTab, setActiveTab] = useState<"transfers" | "internal">(
    "transfers"
  );

  const internalQuery = useInternalTransfers({
    chainId: 0,
    page: 1,
    pageSize: 25,
    sort: "desc",
    address: normalizedAddress,
  });

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(normalizedAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const balances = data?.balances ?? [];
  const nonZeroChains = balances.filter(
    (b) => typeof b.balance === "number" && b.balance > 0
  );

  const recentTransfers = data?.activity?.recentTransfers ?? [];
  const internalTransfers = internalQuery.data?.data ?? [];

  const formatBzr = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return "--";
    return value.toLocaleString(undefined, {
      minimumFractionDigits: value < 1 ? 4 : 2,
      maximumFractionDigits: value < 1 ? 6 : 2,
    });
  };

  const transfersRows = useMemo(() => {
    return recentTransfers;
  }, [recentTransfers]);

  if (!isValidAddress) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-sm text-gray-600">Invalid address.</p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : "Failed to load address."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        id="address-title"
        className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 scroll-mt-24"
      >
        <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg text-blue-600">
          <User className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
            {truncateHash(normalizedAddress, 8, 6)}
          </h1>
          <button
            onClick={handleCopy}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={copied ? "Address copied" : "Copy address"}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <a
            href={getExplorerUrl("Ethereum", normalizedAddress, "address")}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open in explorer"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl bg-white shadow-sm p-5 border border-gray-100">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Total Balance (BZR)
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {formatBzr(data.totalBalance)}
          </div>
          {data.stale && (
            <div className="text-xs text-amber-600 mt-1">
              Some chains unavailable
            </div>
          )}
        </div>
        <div className="rounded-xl bg-white shadow-sm p-5 border border-gray-100">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Chains Holding
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {nonZeroChains.length}
          </div>
        </div>
        <div className="rounded-xl bg-white shadow-sm p-5 border border-gray-100">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Transfers
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {data.activity?.transferCount?.toLocaleString() ?? "--"}
          </div>
        </div>
      </div>

      {/* Per-chain balances */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900">
          Balances by Chain
        </div>
        <div className="divide-y divide-gray-100">
          {balances.map((b) => (
            <div
              key={b.chainId}
              className="px-4 py-3 flex items-center justify-between text-sm"
            >
              <div className="text-gray-700">{b.chainName}</div>
              <div className="font-mono text-gray-900">
                {b.balance !== null ? formatBzr(b.balance) : "--"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setActiveTab("transfers")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
            activeTab === "transfers"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Transfers
        </button>
        <button
          onClick={() => setActiveTab("internal")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
            activeTab === "internal"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Internal Txns
        </button>
      </div>

      {/* Transfers tab */}
      {activeTab === "transfers" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ArrowRightLeft className="w-4 h-4 text-gray-500" />
            Recent Transfers
          </div>
          {transfersRows.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No transfers found for this address.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left min-w-[640px]">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3">Txn Hash</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3">Age</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3">From</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3">To</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-right">
                      Value
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3">Chain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transfersRows.map((tx) => (
                    <tr key={tx.hash} className="hover:bg-gray-50">
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
                      <td className="px-3 sm:px-6 py-3 text-gray-600">
                        {timeAgo(tx.timeStamp)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 font-mono">
                        <Link
                          to={`/address/${tx.from}`}
                          className="text-blue-600 hover:underline"
                        >
                          {truncateHash(tx.from)}
                        </Link>
                      </td>
                      <td className="px-3 sm:px-6 py-3 font-mono">
                        <Link
                          to={`/address/${tx.to}`}
                          className="text-blue-600 hover:underline"
                        >
                          {truncateHash(tx.to)}
                        </Link>
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-right font-medium">
                        {formatValue(tx.value, Number(tx.tokenDecimal) || 18)}{" "}
                        {tx.tokenSymbol}
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-gray-700">
                        {tx.chainName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Internal tab */}
      {activeTab === "internal" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Layers className="w-4 h-4 text-gray-500" />
            Internal Transactions
          </div>
          {internalQuery.isLoading ? (
            <div className="p-6">
              <LoadingSpinner />
            </div>
          ) : internalTransfers.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No internal transactions found for this address.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left min-w-[640px]">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3">Txn Hash</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3">Age</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3">From</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3">To</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-right">
                      Value
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3">Chain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {internalTransfers.map((tx) => (
                    <tr key={`${tx.chainId}-${tx.hash}-${tx.blockNumber}`} className="hover:bg-gray-50">
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
                      <td className="px-3 sm:px-6 py-3 text-gray-600">
                        {timeAgo(tx.timeStamp)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 font-mono">
                        <Link
                          to={`/address/${tx.from}`}
                          className="text-blue-600 hover:underline"
                        >
                          {truncateHash(tx.from)}
                        </Link>
                      </td>
                      <td className="px-3 sm:px-6 py-3 font-mono">
                        <Link
                          to={`/address/${tx.to}`}
                          className="text-blue-600 hover:underline"
                        >
                          {truncateHash(tx.to)}
                        </Link>
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-right font-medium">
                        {formatValue(tx.value, 18)} BZR
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-gray-700">
                        {tx.chainName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
