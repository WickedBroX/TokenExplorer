import { X, ExternalLink, Copy, Check, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import type { SearchResult } from '../utils/searchUtils';
import { truncateHash } from '../utils/searchUtils';

interface TransactionDetailsModalProps {
  result: SearchResult | null;
  onClose: () => void;
  onShowAllTransfers?: (address: string) => void;
}

export const TransactionDetailsModal = ({ 
  result, 
  onClose,
  onShowAllTransfers 
}: TransactionDetailsModalProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!result || !result.found || result.searchType !== 'transaction') {
    return null;
  }

  const { data } = result;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getExplorerUrl = (chainName: string, hash: string) => {
    const explorers: Record<string, string> = {
      'Ethereum': `https://etherscan.io/tx/${hash}`,
      'Polygon': `https://polygonscan.com/tx/${hash}`,
      'BSC': `https://bscscan.com/tx/${hash}`,
      'Arbitrum': `https://arbiscan.io/tx/${hash}`,
      'Optimism': `https://optimistic.etherscan.io/tx/${hash}`,
      'Avalanche': `https://snowtrace.io/tx/${hash}`,
      'Base': `https://basescan.org/tx/${hash}`,
      'zkSync': `https://explorer.zksync.io/tx/${hash}`,
      'Mantle': `https://mantlescan.xyz/tx/${hash}`,
      'Cronos': `https://cronoscan.com/tx/${hash}`,
    };

    return explorers[chainName] || `https://etherscan.io/tx/${hash}`;
  };

  const formatTimestamp = (timestamp: number | string) => {
    const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
    const date = new Date(ts * 1000);
    return date.toLocaleString();
  };

  const formatValue = (value: string) => {
    try {
      const numValue = BigInt(value);
      const divisor = BigInt(10) ** BigInt(18); // Assuming 18 decimals for BZR
      const integerPart = numValue / divisor;
      const remainder = numValue % divisor;
      
      if (remainder === BigInt(0)) {
        return `${integerPart.toString()} BZR`;
      }
      
      const fractional = remainder.toString().padStart(18, '0').slice(0, 4);
      return `${integerPart.toString()}.${fractional} BZR`;
    } catch {
      return value;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Transaction Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              Found on {data?.chainName || 'Blockchain'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Transaction Hash */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Transaction Hash
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <code className="flex-1 text-sm font-mono text-gray-900 break-all">
                {data?.hash}
              </code>
              <button
                onClick={() => data?.hash && copyToClipboard(data.hash, 'hash')}
                className="p-1.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
                title="Copy hash"
              >
                {copiedField === 'hash' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Grid: Block & Timestamp */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Block Number
              </label>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-lg font-bold text-blue-900">
                  {data?.blockNumber?.toLocaleString()}
                </p>
              </div>
            </div>

            {data?.timestamp && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Timestamp
                </label>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-purple-900">
                    {formatTimestamp(data.timestamp)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Transfer Details */}
          <div className="space-y-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <h3 className="text-sm font-semibold text-green-900 uppercase tracking-wide">
              Transfer Details
            </h3>

            {/* From Address */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                From
              </label>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-green-200">
                <code className="flex-1 text-sm font-mono text-gray-900">
                  {data?.from ? truncateHash(data.from, 10, 8) : 'N/A'}
                </code>
                {data?.from && (
                  <>
                    <button
                      onClick={() => data.from && copyToClipboard(data.from, 'from')}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Copy from address"
                    >
                      {copiedField === 'from' ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-600" />
                      )}
                    </button>
                    {onShowAllTransfers && (
                      <button
                        onClick={() => onShowAllTransfers(data.from!)}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        title="Show all transfers from this address"
                      >
                        View
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-green-600" />
            </div>

            {/* To Address */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                To
              </label>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-green-200">
                <code className="flex-1 text-sm font-mono text-gray-900">
                  {data?.to ? truncateHash(data.to, 10, 8) : 'N/A'}
                </code>
                {data?.to && (
                  <>
                    <button
                      onClick={() => data.to && copyToClipboard(data.to, 'to')}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Copy to address"
                    >
                      {copiedField === 'to' ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-600" />
                      )}
                    </button>
                    {onShowAllTransfers && (
                      <button
                        onClick={() => onShowAllTransfers(data.to!)}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        title="Show all transfers to this address"
                      >
                        View
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Value */}
            {data?.value && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Value
                </label>
                <div className="p-3 bg-white rounded border border-green-200">
                  <p className="text-xl font-bold text-green-700">
                    {formatValue(data.value)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Gas Details */}
          {data?.gasUsed && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Gas Used
              </label>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-900">
                  {data.gasUsed}
                </p>
              </div>
            </div>
          )}

          {/* Chain Info */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Network
            </label>
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex-1">
                <p className="text-lg font-bold text-indigo-900">
                  {data?.chainName || 'Unknown Chain'}
                </p>
                <p className="text-xs text-indigo-600">
                  Chain ID: {data?.chainId}
                </p>
              </div>
            </div>
          </div>

          {/* Source Info */}
          <div className="text-xs text-gray-500 text-center">
            Data source: {result.source === 'database' ? 'Local Database' : 'Blockchain Explorer'}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <a
            href={getExplorerUrl(data?.chainName || 'Ethereum', data?.hash || '')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            View on Explorer
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
