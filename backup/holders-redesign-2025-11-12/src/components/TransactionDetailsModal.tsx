import { X, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { SearchResult } from '../utils/searchUtils';

interface TransactionDetailsModalProps {
  result: SearchResult | null;
  onClose: () => void;
}

export const TransactionDetailsModal = ({ 
  result, 
  onClose
}: TransactionDetailsModalProps) => {
  if (!result || !result.found || result.searchType !== 'transaction') {
    return null;
  }

  const { data } = result;

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

  const getAddressExplorerUrl = (chainName: string, address: string) => {
    const explorers: Record<string, string> = {
      'Ethereum': `https://etherscan.io/address/${address}`,
      'Polygon': `https://polygonscan.com/address/${address}`,
      'BSC': `https://bscscan.com/address/${address}`,
      'Arbitrum': `https://arbiscan.io/address/${address}`,
      'Optimism': `https://optimistic.etherscan.io/address/${address}`,
      'Avalanche': `https://snowtrace.io/address/${address}`,
      'Base': `https://basescan.org/address/${address}`,
      'zkSync': `https://explorer.zksync.io/address/${address}`,
      'Mantle': `https://mantlescan.xyz/address/${address}`,
      'Cronos': `https://cronoscan.com/address/${address}`,
    };

    return explorers[chainName] || `https://etherscan.io/address/${address}`;
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
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-xl max-w-2xl w-full p-6 relative overflow-hidden transform transition-all shadow-xl max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-400"></div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <h3 className="text-xl font-bold text-gray-900 mb-4 pr-8">Transaction Details</h3>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Chain</span>
                <span className="text-gray-900 font-semibold">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-600">
                    {data?.chainName || 'Unknown Chain'}
                  </span>
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              {/* Transaction Hash */}
              <DetailRow
                label="Transaction Hash"
                value={data?.hash || ''}
                link={getExplorerUrl(data?.chainName || 'Ethereum', data?.hash || '')}
                copyable
              />

              {/* Block Information */}
              <DetailRow label="Block" value={data?.blockNumber?.toLocaleString() || 'N/A'} />

              {/* Time Information */}
              {data?.timestamp && (
                <DetailRow
                  label="Timestamp"
                  value={formatTimestamp(data.timestamp)}
                />
              )}

              {/* Address Information */}
              <DetailRow 
                label="From" 
                value={data?.from || 'N/A'} 
                link={data?.from ? getAddressExplorerUrl(data?.chainName || 'Ethereum', data.from) : undefined}
                copyable 
              />
              <DetailRow 
                label="To" 
                value={data?.to || 'N/A'} 
                link={data?.to ? getAddressExplorerUrl(data?.chainName || 'Ethereum', data.to) : undefined}
                copyable 
              />

              {/* Value Information */}
              {data?.value && (
                <DetailRow
                  label="Value"
                  value={formatValue(data.value)}
                />
              )}

              {/* Gas Information */}
              {data?.gasUsed && (
                <DetailRow label="Gas Used" value={data.gasUsed} />
              )}

              {/* Network Information */}
              <DetailRow label="Chain ID" value={data?.chainId?.toString() || 'N/A'} />
            </div>

            <a
              href={getExplorerUrl(data?.chainName || 'Ethereum', data?.hash || '')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on {data?.chainName || 'Ethereum'} Explorer
            </a>

            <div className="text-xs text-gray-500 text-center pt-2">
              Data source: {result.source === 'database' ? 'Local Database' : 'Blockchain Explorer'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// DetailRow component
const DetailRow: React.FC<{
  label: string;
  value: string;
  link?: string;
  copyable?: boolean;
}> = ({ label, value, link, copyable }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus('success');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      setCopyStatus('error');
    }

    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const truncateHash = (hash: string, startChars: number = 10, endChars: number = 10) => {
    if (hash.length <= startChars + endChars) return hash;
    return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className="flex w-full sm:w-auto flex-wrap items-start sm:items-center gap-2 sm:gap-3 sm:justify-end text-gray-900">
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors break-all sm:text-right font-mono"
            >
              <span>{value.length > 42 ? truncateHash(value, 10, 10) : value}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <span className="text-gray-900 break-all sm:text-right font-mono">
              {value.length > 42 ? truncateHash(value, 10, 10) : value}
            </span>
          )}
          {copyable && (
            <button
              onClick={handleCopy}
              aria-label={`Copy ${label}`}
              className="self-start sm:self-center text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-200"
              title="Copy to clipboard"
            >
              {copyStatus === 'success' ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
