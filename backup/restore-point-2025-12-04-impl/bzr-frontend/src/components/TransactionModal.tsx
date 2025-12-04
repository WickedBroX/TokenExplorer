import React, { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Transfer } from "../types/api";
import {
  timeAgo,
  formatValue,
  getExplorerUrl,
  truncateHash,
} from "../utils/formatters";

interface TransactionModalProps {
  transaction: Transfer | null;
  onClose: () => void;
}

const DetailRow: React.FC<{
  label: string;
  value: string;
  link?: string;
  copyable?: boolean;
  badge?: boolean;
}> = ({ label, value, link, copyable, badge }) => {
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("success");
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      setCopyStatus("error");
    }

    setTimeout(() => setCopyStatus("idle"), 2000);
  };

  return (
    <div className="p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs sm:text-sm font-medium text-gray-500">
          {label}
        </span>
        <div className="flex w-full sm:w-auto flex-wrap items-start sm:items-center gap-2 sm:gap-3 sm:justify-end text-gray-900">
          {badge ? (
            <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              {value}
            </span>
          ) : link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs sm:text-sm text-blue-500 hover:text-blue-400 transition-colors break-all sm:text-right font-mono"
            >
              <span>
                {value.length > 42 ? truncateHash(value, 10, 10) : value}
              </span>
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            </a>
          ) : (
            <span className="text-xs sm:text-sm text-gray-900 break-all sm:text-right font-mono">
              {value.length > 42 ? truncateHash(value, 10, 10) : value}
            </span>
          )}
          {copyable && (
            <button
              onClick={handleCopy}
              aria-label={`Copy ${label}`}
              className="self-start sm:self-center text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-200 flex-shrink-0"
              title="Copy to clipboard"
            >
              {copyStatus === "success" ? (
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {copyStatus === "success" && `${label} copied to clipboard.`}
        {copyStatus === "error" && `Unable to copy ${label}.`}
      </span>
    </div>
  );
};

export const TransactionModal: React.FC<TransactionModalProps> = ({
  transaction,
  onClose,
}) => {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 lg:p-6">
        <div className="bg-white rounded-t-2xl sm:rounded-xl max-w-2xl w-full p-4 sm:p-6 relative overflow-hidden transform transition-all shadow-xl max-h-[90vh] sm:max-h-[calc(100vh-4rem)] lg:max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-400"></div>
          <button
            onClick={onClose}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 pr-8">
            Transaction Details
          </h3>

          <div className="space-y-3 sm:space-y-4">
            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Chain</span>
                <span className="text-gray-900 font-semibold">
                  <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-50 text-blue-600">
                    {transaction.chainName}
                  </span>
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4">
              {/* Transaction Information */}
              <DetailRow
                label="Transaction Hash"
                value={transaction.hash}
                link={getExplorerUrl(transaction.chainName, transaction.hash)}
                copyable
              />
              {transaction.functionName && (
                <DetailRow
                  label="Method"
                  value={transaction.functionName}
                  badge
                />
              )}

              {/* Block Information */}
              <DetailRow label="Block" value={transaction.blockNumber} />
              {transaction.blockHash && (
                <DetailRow
                  label="Block Hash"
                  value={transaction.blockHash}
                  copyable
                />
              )}
              {transaction.confirmations && (
                <DetailRow
                  label="Confirmations"
                  value={transaction.confirmations}
                />
              )}

              {/* Time Information */}
              <DetailRow
                label="Timestamp"
                value={`${timeAgo(transaction.timeStamp)} (${new Date(
                  Number(transaction.timeStamp) * 1000
                ).toLocaleString()})`}
              />

              {/* Address Information */}
              <DetailRow
                label="From"
                value={transaction.from}
                link={getExplorerUrl(
                  transaction.chainName,
                  transaction.from,
                  "address"
                )}
                copyable
              />
              <DetailRow
                label="To"
                value={transaction.to}
                link={getExplorerUrl(
                  transaction.chainName,
                  transaction.to,
                  "address"
                )}
                copyable
              />

              {/* Value Information */}
              <DetailRow
                label="Value"
                value={`${formatValue(transaction.value, 18)} ${
                  transaction.tokenSymbol
                }`}
              />

              {/* Gas Information */}
              {(transaction.gasUsed || transaction.gasPrice) && (
                <>
                  {transaction.gasUsed && (
                    <DetailRow
                      label="Gas Used"
                      value={Number(transaction.gasUsed).toLocaleString()}
                    />
                  )}
                  {transaction.gasPrice && (
                    <DetailRow
                      label="Gas Price"
                      value={`${(Number(transaction.gasPrice) / 1e9).toFixed(
                        2
                      )} Gwei`}
                    />
                  )}
                </>
              )}

              {/* Additional Details */}
              {transaction.transactionIndex && (
                <DetailRow
                  label="Transaction Index"
                  value={transaction.transactionIndex}
                />
              )}
            </div>

            <a
              href={getExplorerUrl(transaction.chainName, transaction.hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 sm:mt-4 w-full flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              View on {transaction.chainName} Explorer
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
