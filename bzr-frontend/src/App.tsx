import * as React from 'react';
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Box, Layers, Info, BarChart2, ExternalLink, HardDrive, Search, Menu, X, TrendingUp, Users, Activity, AlertTriangle, Download, ArrowUpDown, ArrowUp, ArrowDown, Mail, MessageCircle, Send, Loader2 } from 'lucide-react';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  LoadingSpinner,
  ErrorMessage,
  TabButton,
} from './components';
import { NetworkOverview } from './components/NetworkOverview';
import { ContractAddresses } from './components/ContractAddresses';
import { CommunityLinks } from './components/CommunityLinks';
import { MarketData } from './components/MarketData';
import { TransactionDetailsModal } from './components/TransactionDetailsModal';
import { useTokenData } from './hooks/useTokenData';
import { 
  validateSearchQuery, 
  detectSearchType, 
  saveRecentSearch,
  type SearchResult 
} from './utils/searchUtils';

// Lazy load heavy components for better initial load performance
// Note: Using new WorldClassAnalyticsTab instead of old AnalyticsTab
const WorldClassAnalyticsTab = lazy(() => import('./components/WorldClassAnalyticsTab').then(module => ({ default: module.WorldClassAnalyticsTab })));
import type { Transfer, Holder } from './types/api';

type ActiveTab = 'transfers' | 'info' | 'analytics' | 'holders';

interface TransactionModalProps {
  transaction: Transfer | null;
  onClose: () => void;
}

// --- Contract Links (Static Data) ---
const BZR_TOKEN_ADDRESS = '0x85Cb098bdcD3Ca929d2cD18Fc7A2669fF0362242';

const contractLinks = [
  { name: 'Ethereum', url: `https://etherscan.io/address/${BZR_TOKEN_ADDRESS}` },
  { name: 'Polygon', url: `https://polygonscan.com/address/${BZR_TOKEN_ADDRESS}` },
  { name: 'BSC', url: `https://bscscan.com/address/${BZR_TOKEN_ADDRESS}` },
  { name: 'Arbitrum', url: `https://arbiscan.io/address/${BZR_TOKEN_ADDRESS}` },
  { name: 'Optimism', url: `https://optimistic.etherscan.io/address/${BZR_TOKEN_ADDRESS}` },
  { name: 'Avalanche', url: `https://subnets.avax.network/c-chain/address/${BZR_TOKEN_ADDRESS}` },
  { name: 'Base', url: `https://basescan.org/address/${BZR_TOKEN_ADDRESS}` },
  { name: 'zkSync', url: `https://explorer.zksync.io/address/${BZR_TOKEN_ADDRESS}` },
  { name: 'Mantle', url: `https://mantlescan.xyz/address/${BZR_TOKEN_ADDRESS}` },
  { name: 'Cronos', url: `https://cronoscan.com/address/${BZR_TOKEN_ADDRESS}` },
];

// --- Helper Functions ---
const truncateHash = (hash: string, start = 6, end = 4) => {
  return `${hash.substring(0, start)}...${hash.substring(hash.length - end)}`;
};

const formatValue = (value: string, decimals: number): string => {
  try {
  const numValue = BigInt(value);
  const decimalUnits = Number.isFinite(decimals) ? Math.max(Math.floor(decimals), 0) : 0;
    const divisor = BigInt(10) ** BigInt(decimalUnits);

    if (divisor === BigInt(0)) {
      return '0';
    }

    const integerPart = numValue / divisor;
    const remainder = numValue % divisor;

    if (remainder === BigInt(0)) {
      return integerPart.toString();
    }

    const remainderString = remainder.toString().padStart(decimalUnits, '0');
    const fractionalPrecision = remainderString.slice(0, Math.max(4, 1)).replace(/0+$/, '');

    return `${integerPart.toString()}.${fractionalPrecision || '0'}`;
  } catch (e) {
    console.error('Error formatting value:', e);
    return '0';
  }
};

const timeAgo = (timestamp: string): string => {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) {
    return 'Unknown time';
  }

  const now = Date.now();
  const seconds = Math.floor(now / 1000) - parsed;

  const safeSeconds = Math.max(seconds, 0);

  let interval = safeSeconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = safeSeconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = safeSeconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = safeSeconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = safeSeconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(safeSeconds) + " seconds ago";
};

const getExplorerUrl = (chainName: string, hash: string, type: 'tx' | 'address' = 'tx'): string => {
  const link = contractLinks.find(l => l.name === chainName);
  if (!link) return '#';
  return link.url.replace(`address/${BZR_TOKEN_ADDRESS}`, `${type}/${hash}`);
};

// --- CSV Export Utility ---
const exportToCSV = (transfers: Transfer[], filename: string = 'bzr-transfers.csv') => {
  if (transfers.length === 0) return;

  // CSV Headers
  const headers = [
    'Transaction Hash',
    'Block Number',
    'Timestamp',
    'Age',
    'From Address',
    'To Address',
    'Value (BZR)',
    'Method',
    'Chain',
    'Gas Used',
    'Gas Price (Gwei)',
    'Confirmations'
  ];

  // Helper to escape CSV fields
  const escapeCSV = (value: string | undefined | null): string => {
    if (value === undefined || value === null) return '';
    const stringValue = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Convert transfers to CSV rows
  const rows = transfers.map(tx => {
    const value = parseFloat(tx.value) / Math.pow(10, tx.tokenDecimal || 18);
    const gasPrice = tx.gasPrice ? (parseFloat(tx.gasPrice) / 1e9).toFixed(2) : '';
    const timestampMs = parseInt(tx.timeStamp) * 1000;
    const age = timeAgo(timestampMs.toString());
    
    return [
      escapeCSV(tx.hash),
      escapeCSV(tx.blockNumber),
      escapeCSV(tx.timeStamp),
      escapeCSV(age),
      escapeCSV(tx.from),
      escapeCSV(tx.to),
      value.toFixed(6),
      escapeCSV(tx.functionName || tx.methodId || 'Transfer'),
      escapeCSV(tx.chainName),
      escapeCSV(tx.gasUsed),
      gasPrice,
      escapeCSV(tx.confirmations)
    ].join(',');
  });

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export holders data to CSV
const exportHoldersToCSV = (holders: Holder[], chainName: string, filename?: string) => {
  if (holders.length === 0) return;

  const timestamp = new Date().toISOString().split('T')[0];
  const defaultFilename = `bzr-holders-${chainName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.csv`;

  // CSV Headers
  const headers = ['Rank', 'Address', 'Balance (BZR)', 'Percentage'];

  // Helper to escape CSV fields
  const escapeCSV = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const totalSupply = 100000000; // 100M BZR total supply

  // Convert holders to CSV rows
  const rows = holders.map((holder, index) => {
    const balance = parseFloat(holder.TokenHolderQuantity) / Math.pow(10, 18);
    const percentage = (balance / totalSupply) * 100;

    return [
      index + 1,
      escapeCSV(holder.TokenHolderAddress),
      balance.toFixed(6),
      percentage.toFixed(4)
    ].join(',');
  });

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || defaultFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Format USD value with K/M suffixes
const formatUsdValue = (usdValue: number): string => {
  if (usdValue >= 1000000) {
    return `$${(usdValue / 1000000).toFixed(2)}M`;
  } else if (usdValue >= 1000) {
    return `$${(usdValue / 1000).toFixed(2)}K`;
  } else if (usdValue >= 0.01) {
    return `$${usdValue.toFixed(2)}`;
  } else {
    return `$${usdValue.toFixed(4)}`;
  }
};

// --- Modal Component ---
const TransactionModal: React.FC<TransactionModalProps> = ({ transaction, onClose }) => {
  if (!transaction) return null;

  const getExplorerUrl = (chainName: string, hash: string) => {
    const link = contractLinks.find(l => l.name === chainName);
    if (!link) return '#';
    return link.url.replace(`address/${BZR_TOKEN_ADDRESS}`, `tx/${hash}`);
  };

  const getAddressExplorerUrl = (chainName: string, address: string) => {
    const link = contractLinks.find(l => l.name === chainName);
    if (!link) return '#';
    return link.url.replace(`address/${BZR_TOKEN_ADDRESS}`, `address/${address}`);
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
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h3 className="text-xl font-bold text-gray-900 mb-4 pr-8">Transaction Details</h3>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Chain</span>
              <span className="text-gray-900 font-semibold">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-600">
                  {transaction.chainName}
                </span>
              </span>
            </div>
          </div>

          <div className="grid gap-4">
            {/* Transaction Information */}
            <DetailRow
              label="Transaction Hash"
              value={transaction.hash}
              link={getExplorerUrl(transaction.chainName, transaction.hash)}
              copyable
            />
            {transaction.functionName && (
              <DetailRow label="Method" value={transaction.functionName} badge />
            )}

            {/* Block Information */}
            <DetailRow label="Block" value={transaction.blockNumber} />
            {transaction.blockHash && (
              <DetailRow label="Block Hash" value={transaction.blockHash} copyable />
            )}
            {transaction.confirmations && (
              <DetailRow label="Confirmations" value={transaction.confirmations} />
            )}

            {/* Time Information */}
            <DetailRow
              label="Timestamp"
              value={`${timeAgo(transaction.timeStamp)} (${new Date(Number(transaction.timeStamp) * 1000).toLocaleString()})`}
            />

            {/* Address Information */}
            <DetailRow 
              label="From" 
              value={transaction.from} 
              link={getAddressExplorerUrl(transaction.chainName, transaction.from)}
              copyable 
            />
            <DetailRow 
              label="To" 
              value={transaction.to} 
              link={getAddressExplorerUrl(transaction.chainName, transaction.to)}
              copyable 
            />

            {/* Value Information */}
            <DetailRow
              label="Value"
              value={`${formatValue(transaction.value, transaction.tokenDecimal)} ${transaction.tokenSymbol}`}
            />

            {/* Gas Information */}
            {(transaction.gasUsed || transaction.gasPrice) && (
              <>
                {transaction.gasUsed && (
                  <DetailRow label="Gas Used" value={Number(transaction.gasUsed).toLocaleString()} />
                )}
                {transaction.gasPrice && (
                  <DetailRow label="Gas Price" value={`${(Number(transaction.gasPrice) / 1e9).toFixed(2)} Gwei`} />
                )}
              </>
            )}

            {/* Additional Details */}
            {transaction.transactionIndex && (
              <DetailRow label="Transaction Index" value={transaction.transactionIndex} />
            )}
          </div>

          <a
            href={getExplorerUrl(transaction.chainName, transaction.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View on {transaction.chainName} Explorer
          </a>
        </div>
      </div>
    </div>
  </div>
  );
};

const DetailRow: React.FC<{
  label: string;
  value: string;
  link?: string;
  copyable?: boolean;
  badge?: boolean;
}> = ({ label, value, link, copyable, badge }) => {
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

  return (
    <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className="flex w-full sm:w-auto flex-wrap items-start sm:items-center gap-2 sm:gap-3 sm:justify-end text-gray-900">
          {badge ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              {value}
            </span>
          ) : link ? (
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
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {copyStatus === 'success' && `${label} copied to clipboard.`}
        {copyStatus === 'error' && `Unable to copy ${label}.`}
      </span>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('transfers');
  const {
    info,
    transfers,
    stats,
    loadingInfo,
    loadingTransfers,
    refreshing,
    error,
  infoError,
    refresh,
    lastUpdated,
    transfersPagination,
    transfersTotals,
    transfersWarnings,
    transfersChain,
    transfersSource,
    transfersFilters,
    transfersLimits,
    transfersDefaults,
    availableChains,
    warmSummaries,
    // warmTimestamp, // removed - not needed after removing warm cache display
    transfersStale,
    transfersQuery,
    setTransfersChain,
    setTransfersPage,
    setTransfersPageSize,
    setTransfersSort,
    setTransfersBlockRange,
    setTransfersIncludeTotals,
    tokenPrice,
    loadingTokenPrice,
    tokenPriceError,
    loadingStats,
    statsError,
    holders,
    loadingHolders,
    holdersError,
    holdersChainId,
    setHoldersChainId,
    holdersPage,
    setHoldersPage,
    holdersPageSize,
    setHoldersPageSize,
    refreshHolders,
  } = useTokenData();
  const [selectedTransaction, setSelectedTransaction] = useState<Transfer | null>(null);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [globalAllTimeTotal, setGlobalAllTimeTotal] = useState<number | null>(null);
  
  // Track if we've attempted to auto-refresh info for the current tab activation
  const infoAutoRefreshAttempted = React.useRef(false);
  const pageSizeInitializedRef = React.useRef(false);
  const analyticsPageSizeOverrideRef = React.useRef<{ desired: number; previous: number } | null>(null);
  
  // Client-side filters
  const [filterAddress, setFilterAddress] = useState('');
  const [filterBlockNumber, setFilterBlockNumber] = useState('');
  const [filterTxHash, setFilterTxHash] = useState('');

  // Search handler function
  const handleSearch = async (query: string) => {
    if (!query || !query.trim()) {
      setSearchError('Please enter a search query');
      return;
    }

    // Validate the search query
    const validation = validateSearchQuery(query);
    if (!validation.valid) {
      setSearchError(validation.error || 'Invalid search query');
      return;
    }

    // Clear previous errors and results
    setSearchError(null);
    setSearchResult(null);
    setIsSearching(true);

    try {
      // Empty string = relative URL for production (nginx proxy), localhost for dev
      const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const response = await fetch(
        `${API_BASE_URL}/api/search?query=${encodeURIComponent(query.trim())}`,
        { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Search failed');
      }

      const result: SearchResult = await response.json();
      setSearchResult(result);

      // Save to recent searches
      saveRecentSearch({
        query: query.trim(),
        type: detectSearchType(query),
        timestamp: Date.now(),
        found: result.found
      });

      // Clear all filters first
      setFilterAddress('');
      setFilterBlockNumber('');
      setFilterTxHash('');

      // Handle different search types
      if (result.searchType === 'address' && result.found) {
        // For address search, switch to transfers tab and filter
        setFilterAddress(query.trim());
        if (activeTab !== 'transfers') {
          setActiveTab('transfers');
        }
        // Scroll to transfers section
        setTimeout(() => {
          const transfersSection = document.getElementById('transfers-section');
          if (transfersSection) {
            transfersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else if (result.searchType === 'block' && result.found) {
        // For block number search, filter by block number
        setFilterBlockNumber(query.trim());
        if (activeTab !== 'transfers') {
          setActiveTab('transfers');
        }
        // Scroll to transfers section
        setTimeout(() => {
          const transfersSection = document.getElementById('transfers-section');
          if (transfersSection) {
            transfersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else if (result.searchType === 'transaction' && result.found) {
        // Transaction hash search - filter the table
        setFilterTxHash(query.trim());
        if (activeTab !== 'transfers') {
          setActiveTab('transfers');
        }
        // Scroll to transfers section
        setTimeout(() => {
          const transfersSection = document.getElementById('transfers-section');
          if (transfersSection) {
            transfersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
        // Modal will be shown automatically via searchResult state
      }

    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Client-side column sorting
  type SortColumn = 'block' | 'age' | 'value' | 'from' | 'to' | null;
  type SortDirection = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [holderSearch, setHolderSearch] = useState('');
  
  // Note: Old analytics calculations removed - now using WorldClassAnalyticsTab with backend endpoint

  // Capture the all-time total from "All Chains" view (chainId=0) and never change it
  useEffect(() => {
    // Only set global total from "All Chains" view and only if not already set
    if (transfersQuery.chainId === 0 && 
        typeof transfersTotals?.allTimeTotal === 'number' && 
        transfersTotals.allTimeTotalAvailable &&
        globalAllTimeTotal === null) {
      setGlobalAllTimeTotal(transfersTotals.allTimeTotal);
    }
  }, [transfersQuery.chainId, transfersTotals, globalAllTimeTotal]);

  useEffect(() => {
    if (!upgradeMessage) return;

    const timer = window.setTimeout(() => setUpgradeMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [upgradeMessage]);

  // Load holders when the holders tab becomes active
  useEffect(() => {
    if (activeTab === 'holders' && holders.length === 0 && !loadingHolders && !holdersError) {
      refreshHolders();
    }
  }, [activeTab, holders.length, loadingHolders, holdersError, refreshHolders]);

  // Refresh holders when page or page size changes
  useEffect(() => {
    if (activeTab === 'holders') {
      refreshHolders();
    }
  }, [activeTab, holdersPage, holdersPageSize, refreshHolders]);

  // Force reset page size to 10 on initial load if it's been changed
  useEffect(() => {
    if (pageSizeInitializedRef.current) {
      return;
    }

    if (activeTab === 'transfers') {
      pageSizeInitializedRef.current = true;

      if (transfersQuery.pageSize !== 10) {
        console.log('[Init] Forcing page size reset to 10 from', transfersQuery.pageSize);
        setTransfersPageSize(10);
      }
    }
  }, [activeTab, setTransfersPageSize, transfersQuery.pageSize]);
  
  // Load more transfers for analytics when Analytics tab becomes active, reset when leaving
  useEffect(() => {
    if (activeTab === 'analytics') {
      const maxLimit = transfersLimits?.maxPageSize ?? 100;
      const desiredPageSize = Math.min(maxLimit, 500);

      if (desiredPageSize > 0) {
        if (!analyticsPageSizeOverrideRef.current) {
          analyticsPageSizeOverrideRef.current = {
            desired: desiredPageSize,
            previous: transfersQuery.pageSize,
          };
        } else if (analyticsPageSizeOverrideRef.current.desired !== desiredPageSize) {
          analyticsPageSizeOverrideRef.current = {
            desired: desiredPageSize,
            previous: analyticsPageSizeOverrideRef.current.previous,
          };
        }

        if (transfersQuery.pageSize !== desiredPageSize) {
          console.log(`[Analytics] Adjusting page size for analytics to ${desiredPageSize}`);
          setTransfersPageSize(desiredPageSize);
        }
      } else {
        analyticsPageSizeOverrideRef.current = null;
      }
    } else if (analyticsPageSizeOverrideRef.current) {
      const { desired, previous } = analyticsPageSizeOverrideRef.current;

      if (transfersQuery.pageSize === desired) {
        const fallbackPageSize = previous > 0 ? previous : (transfersDefaults?.pageSize ?? 10);
        if (fallbackPageSize !== desired) {
          console.log('[Analytics] Restoring previous page size', fallbackPageSize);
          setTransfersPageSize(fallbackPageSize);
        }
      }

      analyticsPageSizeOverrideRef.current = null;
    }
  }, [activeTab, transfersLimits, transfersQuery.pageSize, setTransfersPageSize, transfersDefaults?.pageSize]);

  // Auto-refresh info when switching to Info tab if data is missing
  // Only attempts once per tab activation to prevent loops
  useEffect(() => {
    if (activeTab === 'info') {
      // Reset the flag when entering info tab
      if (!infoAutoRefreshAttempted.current && (!info || !info.tokenName) && !loadingInfo && !refreshing) {
        console.log('[Info Tab] Auto-refreshing missing token info');
        infoAutoRefreshAttempted.current = true;
        refresh();
      }
    } else {
      // Reset flag when leaving info tab
      infoAutoRefreshAttempted.current = false;
    }
  }, [activeTab, info, loadingInfo, refreshing, refresh]);

  const navItems = React.useMemo(() => (
    [
      { label: 'Transfers', tab: 'transfers' as const },
      { label: 'Info & Contract', tab: 'info' as const },
      { label: 'Analytics', tab: 'analytics' as const },
      { label: 'Holders', tab: 'holders' as const },
    ]
  ), []);

  const handleNavClick = React.useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setIsNavOpen(false);
  }, []);

  const formatUsd = React.useCallback((value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return '—';
    if (value >= 1) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (value >= 0.01) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
    }
    if (value >= 0.000001) {
      return `$${value.toLocaleString(undefined, { minimumSignificantDigits: 2, maximumSignificantDigits: 6 })}`;
    }
    if (value > 0) {
      return `$${value.toExponential(2)}`;
    }
    return '$0.00';
  }, []);

  const chainOptions = React.useMemo(() => {
    const map = new Map<number, { id: number; name: string }>();
    
    // Add "All Chains" aggregated view
    map.set(0, { id: 0, name: 'All Chains' });
    
    availableChains.forEach((chain) => {
      map.set(chain.id, { id: chain.id, name: chain.name });
    });

    if (transfersChain) {
      map.set(transfersChain.id, { id: transfersChain.id, name: transfersChain.name });
    }

    if (!map.has(transfersQuery.chainId)) {
      map.set(transfersQuery.chainId, {
        id: transfersQuery.chainId,
        name: `Chain ${transfersQuery.chainId}`,
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      // Always keep "All Chains" first
      if (a.id === 0) return -1;
      if (b.id === 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [availableChains, transfersChain, transfersQuery.chainId]);

  const chainSelectValue = String(transfersQuery.chainId);

  const pageSizeOptions = React.useMemo(() => {
    const limit = transfersLimits?.maxPageSize ?? Number.POSITIVE_INFINITY;
    const defaults = [10, 25].filter((size) => size <= limit);
    const values = new Set<number>(defaults);
    values.add(transfersQuery.pageSize);
    if (transfersDefaults) {
      values.add(transfersDefaults.pageSize);
    }
    return Array.from(values)
      .filter((size) =>
        size > 0
        && (
          size <= limit
          || size === transfersQuery.pageSize
          || (transfersDefaults ? size === transfersDefaults.pageSize : false)
        )
      )
      .sort((a, b) => a - b);
  }, [transfersQuery.pageSize, transfersLimits, transfersDefaults]);

  const pageSize = transfersQuery.pageSize;
  const currentPage = transfersPagination?.page ?? transfersQuery.page;
  const totalRecords = transfersTotals?.total ?? transfersPagination?.total ?? null;
  const resultWindowLimit = transfersLimits?.resultWindow ?? null;
  const maxWindowPages = React.useMemo(() => {
    if (typeof transfersPagination?.maxWindowPages === 'number') {
      return transfersPagination.maxWindowPages;
    }
    if (resultWindowLimit != null && pageSize > 0) {
      return Math.max(1, Math.floor(resultWindowLimit / pageSize));
    }
    return null;
  }, [transfersPagination?.maxWindowPages, resultWindowLimit, pageSize]);
  const windowExceeded = Boolean(transfersPagination?.windowExceeded);

  const totalPages = React.useMemo(() => {
    const raw = (() => {
      if (transfersPagination?.totalPages && transfersPagination.totalPages > 0) {
        return Math.max(transfersPagination.totalPages, currentPage);
      }

      if (typeof totalRecords === 'number' && totalRecords >= 0 && pageSize > 0) {
        return Math.max(Math.ceil(totalRecords / pageSize), currentPage);
      }

      if (transfersPagination?.hasMore) {
        return currentPage + 1;
      }

      return currentPage || 1;
    })();

    if (maxWindowPages != null) {
      return Math.min(Math.max(raw, currentPage), maxWindowPages);
    }

    return raw;
  }, [
    transfersPagination?.totalPages,
    transfersPagination?.hasMore,
    totalRecords,
    pageSize,
    currentPage,
    maxWindowPages,
  ]);

  const showingStart = transfers.length ? (currentPage - 1) * pageSize + 1 : 0;
  const showingEnd = transfers.length ? showingStart + transfers.length - 1 : 0;
  const canGoPrev = currentPage > 1;
  const canGoNext = React.useMemo(() => {
    if (windowExceeded) {
      return false;
    }
    if (maxWindowPages != null && currentPage >= maxWindowPages) {
      return false;
    }
    if (typeof transfersPagination?.hasMore === 'boolean') {
      return transfersPagination.hasMore;
    }
    if (typeof totalRecords === 'number' && totalRecords >= 0) {
      return totalRecords > currentPage * pageSize;
    }
    return transfers.length === pageSize;
  }, [
    windowExceeded,
    maxWindowPages,
    currentPage,
    transfersPagination?.hasMore,
    totalRecords,
    pageSize,
    transfers.length,
  ]);
  const hasActiveBlockFilter = transfersFilters.startBlock != null || transfersFilters.endBlock != null;
  const includeTotals = transfersQuery.includeTotals;
  const transfersSourceBadge = React.useMemo(() => {
    if (transfersSource === 'cache') {
      return { label: 'Cache', className: 'border-blue-200 bg-blue-50 text-blue-700' };
    }
    if (transfersSource === 'stale-cache') {
      return { label: 'Stale cache', className: 'border-amber-200 bg-amber-50 text-amber-700' };
    }
    return { label: 'Network', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  }, [transfersSource]);
  const totalsTimestampLabel = React.useMemo(() => (
    includeTotals && transfersTotals?.timestamp
      ? timeAgo(String(Math.floor(transfersTotals.timestamp / 1000)))
      : null
  ), [includeTotals, transfersTotals]);

  const handleChainChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) {
      setTransfersChain(value);
    }
  }, [setTransfersChain]);

  const handlePageSizeChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const size = Number(event.target.value);
    if (!Number.isNaN(size)) {
      setTransfersPageSize(size);
    }
  }, [setTransfersPageSize]);

  const handleSortChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value === 'asc' ? 'asc' : 'desc';
    setTransfersSort(value);
  }, [setTransfersSort]);

  const handleClearFilters = React.useCallback(() => {
    setTransfersBlockRange(null, null);
  }, [setTransfersBlockRange]);

  const handleIncludeTotalsChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTransfersIncludeTotals(event.target.checked);
  }, [setTransfersIncludeTotals]);

  const activeChainCount = React.useMemo(
    () => warmSummaries.filter((chain) => chain.status === 'ok').length,
    [warmSummaries]
  );

  const priceMetadata = React.useMemo(() => {
    if (tokenPrice && tokenPrice.available && typeof tokenPrice.priceUsd === 'number' && tokenPrice.priceUsd > 0) {
      return {
        priceUsd: tokenPrice.priceUsd,
        priceUsdRaw: tokenPrice.priceUsdRaw,
        timestamp: tokenPrice.timestamp,
        source: tokenPrice.source,
        message: tokenPrice.message || null,
        stale: false,
      };
    }

    const message = tokenPrice?.message || tokenPriceError?.message || null;

    if (transfersTotals) {
      return {
        priceUsd: null,
        priceUsdRaw: null,
        timestamp: transfersTotals.timestamp || null,
        source: transfersTotals.source ? `transfers:${transfersTotals.source}` : 'transfers:unknown',
        message,
        stale: Boolean(transfersTotals.stale),
      };
    }

    return {
      priceUsd: tokenPrice?.priceUsd ?? null,
      priceUsdRaw: tokenPrice?.priceUsdRaw ?? null,
      timestamp: tokenPrice?.timestamp || null,
      source: tokenPrice?.source || 'unknown',
      message,
      stale: false,
    };
  }, [tokenPrice, tokenPriceError, transfersTotals]);

  const allTimeTotalsSummary = React.useMemo(() => {
    const chainSummaries = Array.isArray(warmSummaries) ? warmSummaries : [];
    const fallbackChainCount = availableChains.filter((chain) => chain.id !== 0).length;
    const totalChainCount = chainSummaries.length || fallbackChainCount;

    const parseTotalValue = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    const defaultChainsReported = chainSummaries.filter((chain) => chain.status === 'ok').length;
    const resolvedChainCount = totalChainCount || defaultChainsReported;

    if (typeof globalAllTimeTotal === 'number' && Number.isFinite(globalAllTimeTotal)) {
      const chainCount = resolvedChainCount || Math.max(defaultChainsReported, 0);
      return {
        value: globalAllTimeTotal,
        isPartial: false,
        availableChains: chainCount,
        totalChains: chainCount,
      };
    }

    if (typeof transfersTotals?.allTimeTotal === 'number' && transfersTotals.allTimeTotalAvailable) {
      const chainCount = resolvedChainCount || Math.max(defaultChainsReported, 0);
      return {
        value: transfersTotals.allTimeTotal,
        isPartial: false,
        availableChains: chainCount,
        totalChains: chainCount,
      };
    }

    const aggregated = chainSummaries.reduce(
      (acc, chain) => {
        const totalsMeta = chain.totals;
  const totalValue = parseTotalValue(totalsMeta?.totalTransfers ?? totalsMeta?.total);

        if (totalValue != null) {
          acc.sum += totalValue;
          if (totalsMeta?.available) {
            acc.available += 1;
          } else {
            acc.partial += 1;
          }
        }
        return acc;
      },
      { sum: 0, available: 0, partial: 0 }
    );

    if (aggregated.available > 0 || aggregated.partial > 0) {
      const reportedChains = aggregated.available + aggregated.partial;
      const totalChains = resolvedChainCount || reportedChains;
      return {
        value: aggregated.sum,
        isPartial: aggregated.partial > 0,
        availableChains: reportedChains,
        totalChains,
      };
    }

    const fallbackTransfersTotal = parseTotalValue(transfersTotals?.total);
    if (fallbackTransfersTotal != null) {
      const chainCount = resolvedChainCount || Math.max(defaultChainsReported, 1);
      return {
        value: fallbackTransfersTotal,
        isPartial: Boolean(transfersTotals?.truncated),
        availableChains: chainCount,
        totalChains: chainCount,
      };
    }

    return {
      value: null,
      isPartial: false,
      availableChains: defaultChainsReported,
      totalChains: resolvedChainCount || defaultChainsReported,
    };
  }, [availableChains, globalAllTimeTotal, transfersTotals, warmSummaries]);

  const quickMetrics = React.useMemo(() => {
    const priceAvailable = typeof priceMetadata.priceUsd === 'number' && priceMetadata.priceUsd > 0;
    const priceValue = priceAvailable
      ? formatUsd(priceMetadata.priceUsd)
      : tokenPrice?.proRequired
        ? 'PRO plan required'
        : '—';

    let priceDescription: string | undefined;
    if (priceMetadata.message) {
      priceDescription = priceMetadata.message;
    } else if (priceMetadata.timestamp) {
      priceDescription = `Updated ${timeAgo(String(Math.floor(priceMetadata.timestamp / 1000)))}`;
    } else if (priceAvailable) {
      priceDescription = 'Live market price';
    } else if (tokenPriceError?.message) {
      priceDescription = tokenPriceError.message;
    }

    const priceSubLabel = priceMetadata.source ? `Source: ${priceMetadata.source}` : undefined;

    const holderRaw = stats?.totalHolders;
    let holderCount: number | null = null;
    if (typeof holderRaw === 'number' && Number.isFinite(holderRaw)) {
      holderCount = holderRaw;
    } else if (typeof holderRaw === 'string') {
      const parsed = Number(holderRaw);
      holderCount = Number.isFinite(parsed) ? parsed : null;
    }
    const holdersValue = holderCount != null ? holderCount.toLocaleString() : '—';
    const holdersDescription = statsError?.message || 'Across 10 supported chains';

    const errorChains = warmSummaries.filter((chain) => chain.status === 'error');

    const totalsUpdatedLabel = transfersTotals?.timestamp
      ? `Updated ${timeAgo(String(Math.floor(transfersTotals.timestamp / 1000)))}`
      : undefined;

    const effectiveTotalChains = allTimeTotalsSummary.totalChains || warmSummaries.length;
    let coverageLabel: string | null = null;
    if (allTimeTotalsSummary.isPartial && effectiveTotalChains > 0) {
      const reportedChains = Math.min(allTimeTotalsSummary.availableChains, effectiveTotalChains);
      coverageLabel = `${reportedChains}/${effectiveTotalChains} chains reporting`;
    } else if (activeChainCount > 0) {
      coverageLabel = `${activeChainCount} chains reporting`;
    }

    const descriptionParts: string[] = [];
    if (transfersStale) {
      descriptionParts.push('Serving cached data while we refresh');
    }
    if (coverageLabel) {
      descriptionParts.push(coverageLabel);
    }
    if (errorChains.length) {
      descriptionParts.push(`${errorChains.length} errors`);
    }
    if (allTimeTotalsSummary.isPartial) {
      descriptionParts.push('partial total');
    }
    if (transfersTotals?.truncated) {
      descriptionParts.push('truncated');
    } else if (totalsUpdatedLabel) {
      descriptionParts.push(totalsUpdatedLabel);
    }

    const transfersDescription = descriptionParts.filter(Boolean).join(' · ') || undefined;

    const transfersValueNumber = allTimeTotalsSummary.value;
    const transfersValue = transfersValueNumber != null
      ? `${allTimeTotalsSummary.isPartial ? '~' : ''}${transfersValueNumber.toLocaleString()}`
      : '—';

    const pendingChains = allTimeTotalsSummary.isPartial && allTimeTotalsSummary.totalChains
      ? Math.max(allTimeTotalsSummary.totalChains - Math.min(allTimeTotalsSummary.availableChains, allTimeTotalsSummary.totalChains), 0)
      : 0;
    const transfersSubLabel = pendingChains > 0
      ? `Waiting for ${pendingChains} chain${pendingChains === 1 ? '' : 's'}`
      : undefined;

    const totalSupplyNumeric = info?.formattedTotalSupply != null ? Number(info.formattedTotalSupply) : Number.NaN;
    const totalSupplyValue = Number.isFinite(totalSupplyNumeric)
      ? totalSupplyNumeric.toLocaleString()
      : '—';
    const totalSupplyDescription = info?.tokenSymbol
      ? `${info.tokenSymbol} max supply`
      : 'Maximum token supply';

    return [
      {
        key: 'price',
        label: 'BZR Price',
        icon: <TrendingUp className="w-5 h-5" />,
        value: priceValue,
        description: priceDescription,
        loading: loadingTokenPrice,
        subLabel: priceSubLabel,
      },
      {
        key: 'holders',
        label: 'Total Holders',
        icon: <Users className="w-5 h-5" />,
        value: holdersValue,
        description: holdersDescription,
        loading: loadingStats,
      },
      {
        key: 'txs',
        label: 'Transfers (all time)',
        icon: <Activity className="w-5 h-5" />,
        value: transfersValue,
        description: transfersDescription,
        loading: loadingTransfers,
        subLabel: transfersSubLabel,
      },
      {
        key: 'totalSupply',
        label: 'Total Supply',
        icon: <HardDrive className="w-5 h-5" />,
        value: totalSupplyValue,
        description: totalSupplyDescription,
        loading: loadingInfo,
      },
    ];
  }, [
    tokenPrice,
    tokenPriceError,
    formatUsd,
    loadingTokenPrice,
    stats,
    statsError,
    loadingStats,
    warmSummaries,
    transfersStale,
    activeChainCount,
    transfersTotals,
    loadingTransfers,
    info,
    loadingInfo,
    priceMetadata,
    allTimeTotalsSummary,
  ]);

  // Handle column sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  };
  
  // Filter holders by search
  const filteredHolders = useMemo(() => {
    if (!holderSearch.trim()) return holders;
    
    const searchLower = holderSearch.toLowerCase().trim();
    return holders.filter(holder => 
      holder.TokenHolderAddress.toLowerCase().includes(searchLower)
    );
  }, [holders, holderSearch]);

  // Calculate holder metrics and chart data
  const holderMetrics = useMemo(() => {
    // Use stats.totalHolders if available (ensure it's a number), otherwise fall back to holders.length
    const totalHolders = stats?.totalHolders ? Number(stats.totalHolders) : holders.length;
    
    if (holders.length === 0) {
      return {
        totalHolders, // Use stats value even if holders array is empty
        top10Percentage: 0,
        averageBalance: 0,
        medianBalance: 0,
        pieChartData: [],
        barChartData: []
      };
    }

    const totalSupply = 100000000; // 100M BZR
    const balances = holders.map(h => parseFloat(h.TokenHolderQuantity) / Math.pow(10, 18));
    
    // Top 10 holders
    const top10Sum = balances.slice(0, Math.min(10, balances.length)).reduce((sum, b) => sum + b, 0);
    const top10Percentage = (top10Sum / totalSupply) * 100;
    
    // Average and median
    const averageBalance = balances.reduce((sum, b) => sum + b, 0) / balances.length;
    const sortedBalances = [...balances].sort((a, b) => b - a);
    const medianBalance = sortedBalances[Math.floor(sortedBalances.length / 2)] || 0;
    
    // Pie chart data: Smart grouping for better visualization
    const pieChartData = [];
    
    // Calculate total supply actually held (sum of all balances)
    const totalHeld = balances.reduce((sum, b) => sum + b, 0);
    
    // Show top 5 holders individually
    const top5 = balances.slice(0, Math.min(5, balances.length));
    top5.forEach((balance, index) => {
      const percentage = (balance / totalHeld) * 100;
      // Only show if percentage is meaningful (> 0.1%)
      if (percentage > 0.1) {
        pieChartData.push({
          name: `#${index + 1} Holder`,
          value: balance,
          percentage: percentage
        });
      }
    });
    
    // Group holders 6-10
    if (balances.length > 5) {
      const top610 = balances.slice(5, Math.min(10, balances.length));
      const top610Sum = top610.reduce((sum, b) => sum + b, 0);
      const percentage = (top610Sum / totalHeld) * 100;
      if (top610Sum > 0 && percentage > 0.1) {
        pieChartData.push({
          name: 'Holders #6-10',
          value: top610Sum,
          percentage: percentage
        });
      }
    }
    
    // Group holders 11-50
    if (balances.length > 10) {
      const top1150 = balances.slice(10, Math.min(50, balances.length));
      const top1150Sum = top1150.reduce((sum, b) => sum + b, 0);
      const percentage = (top1150Sum / totalHeld) * 100;
      if (top1150Sum > 0 && percentage > 0.1) {
        pieChartData.push({
          name: 'Holders #11-50',
          value: top1150Sum,
          percentage: percentage
        });
      }
    }
    
    // Group holders 51-100
    if (balances.length > 50) {
      const top51100 = balances.slice(50, Math.min(100, balances.length));
      const top51100Sum = top51100.reduce((sum, b) => sum + b, 0);
      const percentage = (top51100Sum / totalHeld) * 100;
      if (top51100Sum > 0 && percentage > 0.1) {
        pieChartData.push({
          name: 'Holders #51-100',
          value: top51100Sum,
          percentage: percentage
        });
      }
    }
    
    // All remaining holders
    if (balances.length > 100) {
      const restSum = balances.slice(100).reduce((sum, b) => sum + b, 0);
      const percentage = (restSum / totalHeld) * 100;
      if (restSum > 0 && percentage > 0.1) {
        pieChartData.push({
          name: `Others (${balances.length - 100}+ holders)`,
          value: restSum,
          percentage: percentage
        });
      }
    }
    
    // Bar chart data: Balance distribution
    const ranges = [
      { min: 0, max: 1000, label: '0-1K' },
      { min: 1000, max: 10000, label: '1K-10K' },
      { min: 10000, max: 100000, label: '10K-100K' },
      { min: 100000, max: 1000000, label: '100K-1M' },
      { min: 1000000, max: Infinity, label: '1M+' }
    ];
    
    const barChartData = ranges.map(range => {
      const count = balances.filter(b => b >= range.min && b < range.max).length;
      return {
        range: range.label,
        holders: count
      };
    });
    
    return {
      totalHolders, // Use the value from stats or holders.length calculated at the top
      top10Percentage,
      averageBalance,
      medianBalance,
      pieChartData,
      barChartData
    };
  }, [holders, stats]);

  // Apply client-side filters and sorting
  const visibleTransfers = useMemo(() => {
    let filtered = transfers;
    
    // Filter by address (from or to)
    if (filterAddress) {
      const addressLower = filterAddress.toLowerCase().trim();
      filtered = filtered.filter(tx => 
        tx.from.toLowerCase().includes(addressLower) || 
        tx.to.toLowerCase().includes(addressLower)
      );
    }

    // Filter by block number
    if (filterBlockNumber) {
      const blockNum = filterBlockNumber.trim();
      filtered = filtered.filter(tx => tx.blockNumber === blockNum);
    }

    // Filter by transaction hash
    if (filterTxHash) {
      const hashLower = filterTxHash.toLowerCase().trim();
      filtered = filtered.filter(tx => tx.hash.toLowerCase() === hashLower);
    }
    
    // Sort if column selected
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let comparison = 0;
        
        switch (sortColumn) {
          case 'block':
            comparison = parseInt(a.blockNumber) - parseInt(b.blockNumber);
            break;
          case 'age':
            comparison = parseInt(a.timeStamp) - parseInt(b.timeStamp);
            break;
          case 'value': {
            const aValue = parseFloat(a.value) / Math.pow(10, a.tokenDecimal || 18);
            const bValue = parseFloat(b.value) / Math.pow(10, b.tokenDecimal || 18);
            comparison = aValue - bValue;
            break;
          }
          case 'from':
            comparison = a.from.toLowerCase().localeCompare(b.from.toLowerCase());
            break;
          case 'to':
            comparison = a.to.toLowerCase().localeCompare(b.to.toLowerCase());
            break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    // Limit to current page size to handle cached data properly
    // This prevents showing more items than requested from localStorage cache
    const pageSize = transfersQuery.pageSize;
    const hasAnyFilter = filterAddress || filterBlockNumber || filterTxHash;
    if (filtered.length > pageSize && !hasAnyFilter && !sortColumn) {
      filtered = filtered.slice(0, pageSize);
    }
    
    return filtered;
  }, [transfers, filterAddress, filterBlockNumber, filterTxHash, sortColumn, sortDirection, transfersQuery.pageSize]);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-['Inter']">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        {/* Top Row: Price, Gas, Search, Social Icons */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-2.5">
              {/* Left: BZR Price & Gas */}
              <div className="flex items-center gap-4 sm:gap-6">
                {/* BZR Price */}
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-700">BZR Price:</span>
                  {loadingTokenPrice ? (
                    <span className="text-xs sm:text-sm text-gray-500">Loading...</span>
                  ) : tokenPrice?.available && tokenPrice?.priceUsd ? (
                    <span className="text-xs sm:text-sm font-semibold text-gray-900">
                      ${typeof tokenPrice.priceUsd === 'number' ? tokenPrice.priceUsd.toFixed(6) : tokenPrice.priceUsd}
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm text-gray-500">N/A</span>
                  )}
                </div>
              </div>

              {/* Center: Search Bar (Hidden on mobile) */}
              <div className="hidden lg:flex flex-1 max-w-2xl mx-6">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (searchTerm.trim()) {
                    handleSearch(searchTerm.trim());
                  }
                }} className="w-full">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setSearchError(null); // Clear error when typing
                      }}
                      placeholder="Search by Address / Txn Hash / Block"
                      className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3bb068]/50 focus:border-[#3bb068]"
                      disabled={isSearching}
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 h-4 w-4 text-gray-400 animate-spin" />
                    )}
                  </div>
                  {searchError && (
                    <div className="absolute mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                      {searchError}
                    </div>
                  )}
                </form>
              </div>

              {/* Right: Social Icons */}
              <div className="flex items-center gap-3">
                <a
                  href="https://t.me/Bazaarsapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  title="Telegram Support"
                >
                  <Send className="h-4 w-4 text-gray-700" />
                </a>
                <a
                  href="mailto:support@bazaars.app"
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  title="Email Support"
                >
                  <Mail className="h-4 w-4 text-gray-700" />
                </a>
              </div>
            </div>

            {/* Mobile Search Bar */}
            <div className="lg:hidden pb-2.5">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (searchTerm.trim()) {
                  handleSearch(searchTerm.trim());
                }
              }} className="w-full">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSearchError(null); // Clear error when typing
                    }}
                    placeholder="Search Address / Txn / Block..."
                    className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3bb068]/50 focus:border-[#3bb068]"
                    disabled={isSearching}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                  )}
                </div>
                {searchError && (
                  <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    {searchError}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Row: Logo & Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src="https://res.cloudinary.com/dhznjbcys/image/upload/v1762175462/BZR-SCAN-V2_iybuqz.png"
                alt="Bazaars Scan Logo"
                className="h-9 sm:h-10 w-auto"
              />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => handleNavClick(item.tab)}
                  className={`text-sm font-medium transition-colors ${activeTab === item.tab ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-lg bg-gray-100 p-2 text-gray-700 transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3bb068]/30"
              onClick={() => setIsNavOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              {isNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Navigation Menu */}
          {isNavOpen && (
            <nav className="md:hidden pb-4 flex flex-col gap-2">
              {navItems.map((item) => (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => handleNavClick(item.tab)}
                  className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition ${
                    activeTab === item.tab 
                      ? 'bg-gray-100 text-gray-900 border-gray-300 shadow-sm' 
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* --- Hero Section --- */}
      <div className="relative overflow-hidden bg-white">
        <div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-10">
            <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-xl sm:text-3xl font-semibold leading-tight text-black">
                    Bazaars Token Explorer
                  </h1>
                </div>
              </div>

              <div className="bg-white text-gray-900 rounded-3xl shadow-md border border-gray-200 overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100" style={{ backgroundColor: '#ffffff' }}>
                  <h2 className="text-base font-semibold text-gray-900">Network Overview</h2>
                  {transfersStale && (
                    <span
                      className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700"
                      aria-label="Transfers updating"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-y-0 sm:divide-x" style={{ backgroundColor: '#ffffff' }}>
                  {quickMetrics.map((metric, index) => (
                    <div
                      key={metric.key}
                      className={`p-6 sm:p-7 ${index >= 2 ? 'border-t border-gray-100 sm:border-t-0' : ''} ${index % 2 === 1 ? 'sm:border-l border-gray-100' : ''}`}
                      style={{ backgroundColor: '#ffffff' }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                          {metric.icon}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-gray-500">{metric.label}</p>
                          {metric.loading ? (
                            <div className="mt-1 h-5 w-24 rounded bg-gray-200 animate-pulse" />
                          ) : (
                            <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
                          )}
                          {metric.description && (
                            <p className="text-xs text-gray-500">{metric.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-16">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="space-y-6 sm:space-y-8 lg:space-y-12">
            {upgradeMessage && (
              <div
                className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-900 shadow-sm"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-start justify-between gap-3">
                  <span>{upgradeMessage}</span>
                  <button
                    type="button"
                    onClick={() => setUpgradeMessage(null)}
                    className="text-blue-600 hover:text-blue-800"
                    aria-label="Dismiss upgrade notice"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* --- Loading, Error, and Content --- */}
            {loadingInfo && <LoadingSpinner />}
            {!loadingInfo && error && <ErrorMessage message={error.message} />}

            {!loadingInfo && info && (
              <div className="space-y-8 sm:space-y-10 lg:space-y-12">
                {/* --- Navigation Tabs --- */}
                <div className="border-b border-gray-200 mt-4 sm:mt-6 mb-6 sm:mb-8">
                  <nav className="-mb-px flex flex-nowrap items-center gap-3 sm:gap-6 md:gap-8 overflow-x-auto pb-1" aria-label="Tabs">
                  <TabButton
                    title="Transfers"
                    icon={<Layers />}
                    isActive={activeTab === 'transfers'}
                    onClick={() => setActiveTab('transfers')}
                  />
                  <TabButton
                    title="Info & Contract"
                    icon={<Info />}
                    isActive={activeTab === 'info'}
                    onClick={() => setActiveTab('info')}
                  />
                  <TabButton
                    title="Analytics"
                    icon={<BarChart2 />}
                    isActive={activeTab === 'analytics'}
                    onClick={() => setActiveTab('analytics')}
                  />
                  <TabButton
                    title="Holders"
                    icon={<Users />}
                    isActive={activeTab === 'holders'}
                    onClick={() => setActiveTab('holders')}
                  />
                  </nav>
                </div>

                {/* --- Tab Content --- */}
                <div className="space-y-8">
                {/* --- Transfers Tab --- */}
                {activeTab === 'transfers' && (
                  <div id="transfers-section" className="bg-white shadow-xl rounded-lg overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-gray-200 space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Latest Aggregated Transfers</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={refresh}
                              disabled={refreshing}
                              className={`inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70`}
                            >
                              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              {refreshing ? 'Refreshing...' : 'Refresh'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const timestamp = new Date().toISOString().split('T')[0];
                                const filename = `bzr-transfers-${timestamp}.csv`;
                                exportToCSV(visibleTransfers, filename);
                              }}
                              disabled={visibleTransfers.length === 0}
                              className={`inline-flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-600 transition-all hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50`}
                              title="Export visible transfers to CSV"
                            >
                              <Download className="w-4 h-4" />
                              Export ({visibleTransfers.length})
                            </button>
                          </div>
                          {lastUpdated && (
                            <span className="text-xs text-gray-500 mt-2 sm:mt-0">
                              Updated {timeAgo(String(Math.floor(lastUpdated / 1000)))}
                            </span>
                          )}
                          {transfersStale && (
                            <span className="text-xs text-amber-600 mt-1 sm:mt-0">
                              Showing cached data while new transfers load.
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${transfersSourceBadge.className}`}
                          >
                            Source: {transfersSourceBadge.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                        {chainOptions.length > 0 && (
                          <label className="flex items-center gap-2">
                            <span className="font-medium uppercase tracking-wide text-gray-500">Chain</span>
                            <select
                              value={chainSelectValue}
                              onChange={handleChainChange}
                              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                            >
                              {chainOptions.map((chain) => (
                                <option key={chain.id} value={String(chain.id)}>
                                  {chain.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <label className="flex items-center gap-2">
                          <span className="font-medium uppercase tracking-wide text-gray-500">Page Size</span>
                          <select
                            value={String(pageSize)}
                            onChange={handlePageSizeChange}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                          >
                            {pageSizeOptions.map((size) => (
                              <option key={size} value={String(size)}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-2">
                          <span className="font-medium uppercase tracking-wide text-gray-500">Sort</span>
                          <select
                            value={transfersQuery.sort}
                            onChange={handleSortChange}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                          >
                            <option value="desc">Newest first</option>
                            <option value="asc">Oldest first</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={includeTotals}
                            onChange={handleIncludeTotalsChange}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400/40"
                          />
                          <span className="font-medium text-gray-600">Include totals</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <span className="font-medium uppercase tracking-wide text-gray-500">Address</span>
                          <input
                            type="text"
                            value={filterAddress}
                            onChange={(e) => setFilterAddress(e.target.value)}
                            placeholder="Filter by address..."
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 w-48"
                          />
                          {filterAddress && (
                            <button
                              type="button"
                              onClick={() => setFilterAddress('')}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="Clear address filter"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </label>
                      </div>

                      {(hasActiveBlockFilter || filterAddress || filterBlockNumber || filterTxHash) && (
                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
                          <span className="font-medium text-gray-700">Active filters:</span>
                          {transfersFilters.startBlock != null && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
                              Start ≥ {Number(transfersFilters.startBlock).toLocaleString()}
                            </span>
                          )}
                          {transfersFilters.endBlock != null && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
              End ≤ {Number(transfersFilters.endBlock).toLocaleString()}
                            </span>
                          )}
                          {filterAddress && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-purple-700">
                              Address: {truncateHash(filterAddress, 6, 4)}
                            </span>
                          )}
                          {filterBlockNumber && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-700">
                              Block: {filterBlockNumber}
                            </span>
                          )}
                          {filterTxHash && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-700">
                              Tx: {truncateHash(filterTxHash, 6, 4)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              handleClearFilters();
                              setFilterAddress('');
                              setFilterBlockNumber('');
                              setFilterTxHash('');
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600 transition hover:border-blue-200 hover:text-blue-600"
                          >
                            Clear all filters
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Loading State */}
                    {loadingTransfers && transfers.length === 0 ? (
                      <div className="py-16">
                        <LoadingSpinner />
                      </div>
                    ) : visibleTransfers.length > 0 ? (
                      <>
                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Method
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Transaction Hash
                                </th>
                                <th 
                                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                                  onClick={() => handleSort('age')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className={sortColumn === 'age' ? 'text-blue-600' : 'text-gray-600'}>Age</span>
                                    {sortColumn === 'age' ? (
                                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                                    ) : (
                                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-50" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                                  onClick={() => handleSort('from')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className={sortColumn === 'from' ? 'text-blue-600' : 'text-gray-600'}>From</span>
                                    {sortColumn === 'from' ? (
                                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                                    ) : (
                                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-50" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                                  onClick={() => handleSort('to')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className={sortColumn === 'to' ? 'text-blue-600' : 'text-gray-600'}>To</span>
                                    {sortColumn === 'to' ? (
                                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                                    ) : (
                                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-50" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                                  onClick={() => handleSort('value')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className={sortColumn === 'value' ? 'text-blue-600' : 'text-gray-600'}>Value</span>
                                    {sortColumn === 'value' ? (
                                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                                    ) : (
                                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-50" />
                                    )}
                                  </div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Chain
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {visibleTransfers.map((tx, index) => (
                                <tr 
                                  key={tx.hash}
                                  className={`group cursor-pointer transition-colors ${
                                    index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'
                                  }`}
                                  onClick={() => setSelectedTransaction(tx)}
                                >
                                  {/* Method */}
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    {tx.functionName ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                        {tx.functionName.split('(')[0]}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400">-</span>
                                    )}
                                  </td>
                                  
                                  {/* Transaction Hash */}
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <Box className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                                      <a
                                        href={getExplorerUrl(tx.chainName, tx.hash, 'tx')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-sm font-mono text-blue-600 hover:text-blue-700 hover:underline"
                                      >
                                        {truncateHash(tx.hash, 8, 6)}
                                      </a>
                                    </div>
                                  </td>
                                  
                                  {/* Age */}
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {timeAgo(tx.timeStamp)}
                                  </td>
                                  
                                  {/* From */}
                                  <td className="px-4 py-4">
                                    <a
                                      href={getExplorerUrl(tx.chainName, tx.from, 'address')}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-sm font-mono text-blue-600 hover:text-blue-700 hover:underline"
                                      title={tx.from}
                                    >
                                      {truncateHash(tx.from)}
                                    </a>
                                  </td>
                                  
                                  {/* To */}
                                  <td className="px-4 py-4">
                                    <a
                                      href={getExplorerUrl(tx.chainName, tx.to, 'address')}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-sm font-mono text-blue-600 hover:text-blue-700 hover:underline"
                                      title={tx.to}
                                    >
                                      {truncateHash(tx.to)}
                                    </a>
                                  </td>
                                  
                                  {/* Value */}
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <span className="text-sm font-semibold text-gray-900">
                                      {formatValue(tx.value, tx.tokenDecimal)} {tx.tokenSymbol}
                                    </span>
                                  </td>
                                  
                                  {/* Chain */}
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                                      {tx.chainName}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden divide-y divide-gray-200">
                          {visibleTransfers.map((tx) => (
                            <div 
                              key={tx.hash} 
                              className="group p-4 sm:p-6 flex flex-col space-y-3 hover:bg-gray-50 cursor-pointer transition-all duration-200"
                              onClick={() => setSelectedTransaction(tx)}
                            >
                              <div className="flex items-start space-x-3">
                                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors flex-shrink-0">
                                  <Box className="w-5 h-5 text-gray-600 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <p className="text-sm font-medium text-blue-600 group-hover:text-blue-700 truncate transition-colors">
                                      {truncateHash(tx.hash, 10, 8)}
                                    </p>
                                    {tx.functionName && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                                        {tx.functionName.split('(')[0]}
                                      </span>
                                    )}
                                    <span className="text-xs font-mono py-0.5 px-2 rounded-full bg-blue-50 text-blue-600">
                                      {tx.chainName}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">
                                    {timeAgo(tx.timeStamp)}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-1.5 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="w-12 shrink-0 text-gray-500">From:</span>
                                  <span className="text-blue-600 truncate font-mono" title={tx.from}>
                                    {truncateHash(tx.from)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-12 shrink-0 text-gray-500">To:</span>
                                  <span className="text-blue-600 truncate font-mono" title={tx.to}>
                                    {truncateHash(tx.to)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-12 shrink-0 text-gray-500">Value:</span>
                                  <span className="font-semibold text-gray-900">
                                    {formatValue(tx.value, tx.tokenDecimal)} {tx.tokenSymbol}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {transfersWarnings.length > 0 && (
                          <div className="mt-4 sm:mt-6 px-4 sm:px-6 py-3 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <AlertTriangle className="h-4 w-4" />
                              <span>Transfer warnings</span>
                            </div>
                            <ul className="mt-2 space-y-2 text-sm">
                              {transfersWarnings.map((warning, index) => (
                                <li key={`${warning.scope}-${warning.code}-${index}`} className="flex flex-col">
                                  <span>{warning.message}</span>
                                  <span className="text-xs text-amber-700">{warning.scope} · {warning.code}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-6 text-center text-gray-400">
                        {windowExceeded && resultWindowLimit != null
                          ? `Reached Etherscan's ${resultWindowLimit.toLocaleString()}-transfer window. Narrow the block range or reduce the page size to browse older activity.`
                          : 'No transfers found.'}
                      </div>
                    )}

                    {transfers.length > 0 && (
                      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-1 text-sm text-gray-600">
                          <div className="flex flex-wrap items-center gap-1">
                            {totalRecords != null ? (
                              <>
                                <span>
                                  Showing {showingStart.toLocaleString()} – {showingEnd.toLocaleString()} of {totalRecords.toLocaleString()} transfers
                                </span>
                                {filterAddress && visibleTransfers.length !== transfers.length && (
                                  <span className="text-purple-600">
                                    ({visibleTransfers.length.toLocaleString()} filtered)
                                  </span>
                                )}
                                {transfersTotals?.truncated && (
                                  <span className="text-amber-600">(Totals truncated)</span>
                                )}
                              </>
                            ) : (
                              <span>Showing {transfers.length.toLocaleString()} transfers</span>
                            )}
                            {transfersPagination && transfersPagination.hasMore && totalRecords == null && (
                              <span className="text-gray-400">(More available)</span>
                            )}
                          </div>
                          {includeTotals && totalsTimestampLabel && transfersTotals && (
                            <span className="text-xs text-gray-500">
                              Totals updated {totalsTimestampLabel}
                              {transfersTotals.stale ? ' (stale)' : ''}
                              {transfersTotals.source ? ` · ${transfersTotals.source}` : ''}
                            </span>
                          )}
                          {windowExceeded && resultWindowLimit != null && (
                            <span className="text-xs text-amber-600">
                              Older results are capped at {resultWindowLimit.toLocaleString()} transfers per query. Try narrower filters for historic data.
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (canGoPrev) {
                                setTransfersPage(Math.max(1, currentPage - 1));
                              }
                            }}
                            disabled={!canGoPrev || loadingTransfers}
                            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${(!canGoPrev || loadingTransfers)
                              ? 'cursor-not-allowed border-gray-200 bg-white text-gray-400'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:text-blue-600'}`}
                          >
                            Prev
                          </button>
                          <span className="text-sm text-gray-600">
                            Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (canGoNext) {
                                setTransfersPage(currentPage + 1);
                              }
                            }}
                            disabled={!canGoNext || loadingTransfers}
                            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${(!canGoNext || loadingTransfers)
                              ? 'cursor-not-allowed border-gray-200 bg-white text-gray-400'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:text-blue-600'}`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Transaction Modal */}
                    {selectedTransaction && (
                      <TransactionModal
                        transaction={selectedTransaction}
                        onClose={() => setSelectedTransaction(null)}
                      />
                    )}
                  </div>
                )}

                {/* --- Info & Contract Tab --- */}
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    {loadingInfo && (!info || !info.tokenName) ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      </div>
                    ) : !info || !info.tokenName ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center space-y-4">
                        <div className="flex items-center justify-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          <p className="text-yellow-800 font-medium">
                            {infoError?.message || 'Token information is loading or temporarily unavailable'}
                          </p>
                        </div>
                        <button
                          onClick={refresh}
                          disabled={refreshing}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {refreshing ? 'Loading...' : 'Retry Loading'}
                        </button>
                      </div>
                    ) : (
                      <>
                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                      {/* Left Column: Network Overview (Token Details + Cross-Chain Stats) */}
                      <div className="lg:col-span-1">
                        <NetworkOverview
                          contractLinksCount={contractLinks.length}
                          totalHolders={holderMetrics.totalHolders}
                          activeChainsCount={availableChains.length}
                          tokenInfo={info}
                          loading={loadingInfo}
                          errorMessage={infoError?.message}
                          onRefresh={refresh}
                          refreshing={refreshing}
                        />
                      </div>

                      {/* Middle Column: Contract Addresses */}
                      <div className="lg:col-span-1">
                        <ContractAddresses tokenAddress={BZR_TOKEN_ADDRESS} />
                      </div>

                      {/* Right Column: Community & Market Links */}
                      <div className="lg:col-span-1 space-y-4 md:space-y-6">
                        <CommunityLinks />
                        <MarketData />
                      </div>
                    </div>
                      </>
                    )}
                  </div>
                )}

                {/* --- Analytics Tab (World-Class) --- */}
                {activeTab === 'analytics' && (
                  <div className="bg-gray-900 rounded-lg">
                    <Suspense fallback={<div className="flex items-center justify-center py-12"><LoadingSpinner /></div>}>
                      <WorldClassAnalyticsTab 
                        chainId={transfersQuery.chainId === 0 ? 'all' : transfersQuery.chainId.toString()}
                      />
                    </Suspense>
                  </div>
                )}

                {/* --- Holders Tab --- */}
                {activeTab === 'holders' && (
                  <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100">
                    <div className="p-4 sm:p-6 border-b border-gray-200">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Token Holders</h3>
                          <p className="text-sm text-gray-500 mt-1">Top holders by wallet address</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={holdersChainId}
                            onChange={(e) => setHoldersChainId(Number(e.target.value))}
                            className="block rounded-lg border-gray-300 text-sm py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                          >
                            {availableChains
                              .filter(chain => chain.id !== 0 && chain.id !== 25) // Exclude "All Chains" and Cronos (unsupported)
                              .map(chain => (
                                <option key={chain.id} value={chain.id}>
                                  {chain.name}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => {
                              const chainName = availableChains.find(c => c.id === holdersChainId)?.name || 'Unknown';
                              exportHoldersToCSV(filteredHolders, chainName);
                            }}
                            disabled={filteredHolders.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                            title="Export holders to CSV"
                          >
                            <Download className="w-4 h-4" />
                            Export
                          </button>
                          <button
                            onClick={refreshHolders}
                            disabled={loadingHolders}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                          >
                            <svg
                              className={`w-4 h-4 ${loadingHolders ? 'animate-spin' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Search Filter */}
                    <div className="px-4 sm:px-6 pt-4 pb-0">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search by holder address..."
                          value={holderSearch}
                          onChange={(e) => setHolderSearch(e.target.value)}
                          className="w-full px-4 py-2 pl-10 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <svg
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {holderSearch && (
                          <button
                            onClick={() => setHolderSearch('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            aria-label="Clear search"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {holderSearch && (
                        <p className="text-sm text-gray-600 mt-2">
                          Showing {filteredHolders.length} of {holders.length} holders
                        </p>
                      )}
                    </div>

                    {/* Holder Metrics & Charts */}
                    {!loadingHolders && !holdersError && holders.length > 0 && (
                      <div className="px-4 sm:px-6 pb-4">
                        {/* Metrics Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-5 h-5 text-blue-600" />
                              <p className="text-sm font-medium text-blue-900">Total Holders</p>
                            </div>
                            <p className="text-2xl font-bold text-blue-900">{holderMetrics.totalHolders.toLocaleString()}</p>
                          </div>

                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-5 h-5 text-purple-600" />
                              <p className="text-sm font-medium text-purple-900">Top 10 Holders</p>
                            </div>
                            <p className="text-2xl font-bold text-purple-900">{holderMetrics.top10Percentage.toFixed(2)}%</p>
                          </div>

                          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Activity className="w-5 h-5 text-green-600" />
                              <p className="text-sm font-medium text-green-900">Avg Balance</p>
                            </div>
                            <p className="text-2xl font-bold text-green-900">{holderMetrics.averageBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            <p className="text-xs text-green-700 mt-1">BZR</p>
                          </div>

                          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                            <div className="flex items-center gap-2 mb-2">
                              <BarChart2 className="w-5 h-5 text-orange-600" />
                              <p className="text-sm font-medium text-orange-900">Median Balance</p>
                            </div>
                            <p className="text-2xl font-bold text-orange-900">{holderMetrics.medianBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            <p className="text-xs text-orange-700 mt-1">BZR</p>
                          </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 gap-6">
                          {/* Bar Chart: Balance Distribution */}
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-4">Balance Distribution</h4>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={holderMetrics.barChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis 
                                  dataKey="range" 
                                  style={{ fontSize: '12px' }}
                                  stroke="#6b7280"
                                />
                                <YAxis 
                                  style={{ fontSize: '12px' }}
                                  stroke="#6b7280"
                                />
                                <Tooltip 
                                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                                  formatter={(value: number) => [`${value} holders`, 'Count']}
                                />
                                <Bar dataKey="holders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4 sm:p-6">
                      {loadingHolders ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                            <p className="mt-4 text-sm text-gray-600">Loading holders...</p>
                          </div>
                        </div>
                      ) : holdersError ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-start">
                            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-semibold text-red-800">Error Loading Holders</h4>
                              <p className="text-sm text-red-700 mt-1">{holdersError.message}</p>
                            </div>
                          </div>
                        </div>
                      ) : holders.length === 0 ? (
                        <div className="text-center py-12">
                          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600">No holders found</p>
                          <p className="text-sm text-gray-500 mt-1">Try refreshing or selecting a different chain</p>
                        </div>
                      ) : (
                        <>
                          {/* Desktop Table */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Rank
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Address
                                  </th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Balance
                                  </th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    USD Value
                                  </th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Percentage
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-100">
                                {filteredHolders.map((holder, index) => {
                                  const balance = parseFloat(holder.TokenHolderQuantity) / Math.pow(10, 18);
                                  const totalSupply = 100000000; // 100M BZR total supply
                                  const percentage = (balance / totalSupply) * 100;
                                  const chainName = availableChains.find(c => c.id === holdersChainId)?.name || '';
                                  const usdValue = tokenPrice?.priceUsd ? balance * tokenPrice.priceUsd : null;

                                  return (
                                    <tr key={holder.TokenHolderAddress} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        #{index + 1}
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        <a
                                          href={getExplorerUrl(chainName, holder.TokenHolderAddress, 'address')}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline group"
                                        >
                                          {truncateHash(holder.TokenHolderAddress, 8, 6)}
                                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                                        {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} BZR
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                                        {usdValue !== null ? formatUsdValue(usdValue) : (
                                          <span className="text-gray-400">—</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                                        {percentage.toFixed(4)}%
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Cards */}
                          <div className="md:hidden space-y-3">
                            {filteredHolders.map((holder, index) => {
                              const balance = parseFloat(holder.TokenHolderQuantity) / Math.pow(10, 18);
                              const totalSupply = 100000000; // 100M BZR total supply
                              const percentage = (balance / totalSupply) * 100;
                              const chainName = availableChains.find(c => c.id === holdersChainId)?.name || '';
                              const usdValue = tokenPrice?.priceUsd ? balance * tokenPrice.priceUsd : null;

                              return (
                                <div key={holder.TokenHolderAddress} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded">
                                        Rank #{index + 1}
                                      </span>
                                    </div>
                                    <a
                                      href={getExplorerUrl(chainName, holder.TokenHolderAddress, 'address')}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1">Address</div>
                                      <div className="text-sm font-mono text-gray-900">
                                        {truncateHash(holder.TokenHolderAddress, 10, 8)}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Balance</div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} BZR
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">USD Value</div>
                                        <div className="text-sm font-semibold text-green-600">
                                          {usdValue !== null ? formatUsdValue(usdValue) : (
                                            <span className="text-gray-400">—</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs text-gray-500 mb-1">Percentage</div>
                                        <div className="text-sm text-gray-700">{percentage.toFixed(4)}%</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Pagination Controls */}
                          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                              <label htmlFor="pageSize" className="text-sm text-gray-600">
                                Show:
                              </label>
                              <select
                                id="pageSize"
                                value={holdersPageSize}
                                onChange={(e) => setHoldersPageSize(Number(e.target.value))}
                                className="block rounded-lg border-gray-300 text-sm py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                              >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                              </select>
                              <span className="text-sm text-gray-600">per page</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setHoldersPage(Math.max(1, holdersPage - 1))}
                                disabled={holdersPage === 1 || loadingHolders}
                                className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                              >
                                Previous
                              </button>
                              <span className="text-sm text-gray-600 px-2">
                                Page {holdersPage}
                              </span>
                              <button
                                onClick={() => setHoldersPage(holdersPage + 1)}
                                disabled={holders.length < holdersPageSize || loadingHolders}
                                className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </main>

        {/* Spacer before footer */}
        <div className="h-16 sm:h-20 lg:h-24"></div>

        {/* Footer */}
        <footer className="bg-gradient-to-b from-gray-50 to-white border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {/* Logo and Description */}
              <div className="lg:col-span-1">
                <img
                  src="https://res.cloudinary.com/dhznjbcys/image/upload/v1762175462/BZR-SCAN-V2_iybuqz.png"
                  alt="Bazaars Logo"
                  className="h-10 w-auto mb-4"
                />
                <p className="text-sm text-gray-600 leading-relaxed">
                  Explore and track BZR token transactions across multiple blockchain networks.
                </p>
              </div>

              {/* Markets & Data */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                  Markets & Data
                </h3>
                <ul className="space-y-3">
                  <li>
                    <a
                      href="https://coinmarketcap.com/currencies/bazaars/?utm_medium=widget&utm_campaign=cmcwidget&utm_source=bazaars.app&utm_content=bazaars"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform">CoinMarketCap</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.coingecko.com/en/coins/bazaars"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform">Coingecko</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://etherscan.io/token/0x8d96b4ab6c741a4c8679ae323a100d74f085ba8f"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform">Etherscan</span>
                    </a>
                  </li>
                </ul>
              </div>

              {/* Exchanges */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                  Exchanges
                </h3>
                <ul className="space-y-3">
                  <li>
                    <a
                      href="https://www.bitmart.com/trade/en-US?symbol=BZR_USDT"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform">Bitmart</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.coinstore.com/#/spot/bzrusdt?ts=1715030198858"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform">Coinstore</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.mexc.com/exchange/BZR_USDT"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform">MEXC</span>
                    </a>
                  </li>
                </ul>
              </div>

              {/* Wallets & Services */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                  Wallets & Services
                </h3>
                <ul className="space-y-3">
                  <li>
                    <a
                      href="https://banxa.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform">Banxa</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://metamask.io/en-GB/download"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform">MetaMask</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://trustwallet.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform">Trust Wallet</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Social Links & Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-8 border-t border-gray-200">
              {/* Social Links */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                  🌐 Social Links
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <a
                    href="https://twitter.com/BazaarsBzr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span className="group-hover:translate-x-1 transition-transform">Twitter</span>
                  </a>
                  <a
                    href="https://discord.gg/bazaars-bzr-979586323688087552"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="group-hover:translate-x-1 transition-transform">Discord</span>
                  </a>
                  <a
                    href="https://t.me/BazaarsOfficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
                  >
                    <Send className="h-4 w-4" />
                    <span className="group-hover:translate-x-1 transition-transform">Telegram</span>
                  </a>
                  <a
                    href="https://medium.com/@BazaarsBzr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
                    </svg>
                    <span className="group-hover:translate-x-1 transition-transform">Medium</span>
                  </a>
                  <a
                    href="https://www.facebook.com/Bazaarsapp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="group-hover:translate-x-1 transition-transform">Facebook</span>
                  </a>
                  <a
                    href="https://www.instagram.com/bazaars.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span className="group-hover:translate-x-1 transition-transform">Instagram</span>
                  </a>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                  📞 Contact
                </h3>
                <ul className="space-y-3">
                  <li>
                    <a
                      href="https://t.me/Bazaarsapp"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
                    >
                      <Send className="h-4 w-4" />
                      <span className="group-hover:translate-x-1 transition-transform">Telegram Support</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:support@bazaars.app"
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="group-hover:translate-x-1 transition-transform">support@bazaars.app</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-8 mt-8 border-t border-gray-200">
              <div className="flex justify-center items-center">
                <p className="text-sm text-gray-500">
                  © 2025 Bazaars. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </footer>

        {/* Transaction Details Modal */}
        {searchResult && searchResult.searchType === 'transaction' && (
          <TransactionDetailsModal
            result={searchResult}
            onClose={() => setSearchResult(null)}
          />
        )}
      </div>
    </div>
  );
}