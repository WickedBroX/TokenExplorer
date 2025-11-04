import * as React from 'react';
import { useState, useCallback } from 'react';
import { Box, Layers, Info, BarChart2, ExternalLink, HardDrive, Search } from 'lucide-react';
import { 
  LoadingSpinner, 
  ErrorMessage, 
  TabButton, 
  StatCard, 
  ChainHolderStat, 
  useAutoRefresh 
} from './components';

// --- Types ---
interface TokenInfo {
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: number;
  formattedTotalSupply: string;
}

interface Transfer {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenDecimal: string;
  chainName: string;
  chainId: number;
}

interface ChainStat {
  chainName: string;
  chainId: number;
  holderCount: number;
  isLoading?: boolean;
  error?: string;
}

interface TokenStats {
  totalHolders: number | string;
  chains: ChainStat[];
}

type ApiError = {
  message: string;
};

type ActiveTab = 'transfers' | 'info' | 'analytics';

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

const formatValue = (value: string, decimals: string | number): string => {
  try {
    const numDecimals = Number(decimals);
    const numValue = BigInt(value);
    const divisor = BigInt(10 ** numDecimals);
    
    const integerPart = (numValue / divisor).toString();
    const fractionalPart = (numValue % divisor).toString().padStart(numDecimals, '0').substring(0, 4); // Show 4 decimal places

    if (fractionalPart === "0000") {
      return integerPart;
    }
    
    return `${integerPart}.${fractionalPart}`;
  } catch (e) {
    console.error("Error formatting value:", e);
    return "0";
  }
};

const timeAgo = (timestamp: string): string => {
  const now = Date.now();
  const seconds = Math.floor(now / 1000) - Number(timestamp);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};


// --- Modal Component ---
const TransactionModal: React.FC<TransactionModalProps> = ({ transaction, onClose }) => {
  if (!transaction) return null;

  const getExplorerUrl = (chainName: string, hash: string) => {
    const link = contractLinks.find(l => l.name === chainName);
    if (!link) return '#';
    return link.url.replace(`address/${BZR_TOKEN_ADDRESS}`, `tx/${hash}`);
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 relative overflow-hidden transform transition-all shadow-xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
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
            <DetailRow label="Transaction Hash" 
                      value={transaction.hash}
                      link={getExplorerUrl(transaction.chainName, transaction.hash)}
                      copyable />
            <DetailRow label="Block" value={transaction.blockNumber} />
            <DetailRow label="Timestamp" value={`${timeAgo(transaction.timeStamp)} (${new Date(Number(transaction.timeStamp) * 1000).toLocaleString()})`} />
            <DetailRow label="From" value={transaction.from} copyable />
            <DetailRow label="To" value={transaction.to} copyable />
            <DetailRow label="Value" value={`${formatValue(transaction.value, transaction.tokenDecimal)} ${transaction.tokenSymbol}`} />
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
  );
};

const DetailRow: React.FC<{
  label: string;
  value: string;
  link?: string;
  copyable?: boolean;
}> = ({ label, value, link, copyable }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex justify-between items-center">
        <span className="text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors break-all"
            >
              {value.length > 42 ? truncateHash(value, 10, 10) : value}
              <ExternalLink className="w-4 h-4 ml-1 inline" />
            </a>
          ) : (
            <span className="text-white break-all">
              {value.length > 42 ? truncateHash(value, 10, 10) : value}
            </span>
          )}
          {copyable && (
            <button
              onClick={handleCopy}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-700"
              title="Copy to clipboard"
            >
              {copied ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('transfers');
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [showAllTransfers, setShowAllTransfers] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transfer | null>(null);

  const retryChain = async (_chainId: number) => {
    // This is a pro feature, show upgrade message
    alert('This feature requires a pro plan subscription');
  };

  const fetchData = async (forceRefresh = false) => {
    if (!forceRefresh && loading) return;
    
    setLoading(true);
    setError(null);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    );

    // If we're refreshing stats, mark all chains as loading
    if (stats && forceRefresh) {
      setStats(prev => prev ? {
        ...prev,
        chains: prev.chains.map(chain => ({
          ...chain,
          isLoading: true,
          error: undefined
        }))
      } : null);
    }

    try {
      // Fetch basic data in parallel with timeout
      const responses = await Promise.race([
        Promise.all([
          fetch('/api/info'),
          fetch('/api/transfers')
        ]),
        timeoutPromise
      ]) as [Response, Response];

      const [infoRes, transfersRes] = responses;

      try {
        // Handle info data
        const infoData = await infoRes.json();
        if (infoRes.ok) {
          setInfo(infoData);
        }
      } catch (err) {
        console.error('Failed to fetch info:', err);
      }

      try {
        // Handle transfers data
        const transfersData = await transfersRes.json();
        if (transfersRes.ok) {
          setTransfers(transfersData);
        }
      } catch (err) {
        console.error('Failed to fetch transfers:', err);
      }

      try {
        // Stats is a pro feature, mock the data for now
        setStats({
          totalHolders: "Pro Feature",
          chains: contractLinks.map(link => ({
            chainName: link.name,
            chainId: 0,
            holderCount: 0,
            isLoading: false,
            error: "Pro Feature Required"
          }))
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }

    } catch (err: any) {
      setError({ message: err.message || 'Some data could not be loaded' });
    } finally {
      // Always set loading to false
      setLoading(false);
    }
  };

  const refreshData = useCallback(() => {
    fetchData(true);
  }, []); // Remove fetchData from dependencies

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []); // Remove fetchData from dependencies

  // Auto refresh every 30 seconds
  useAutoRefresh(refreshData);

  const visibleTransfers = showAllTransfers ? transfers : (transfers || []).slice(0, 15);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-['Inter']">
      {/* --- Hero Section --- */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <img 
            src="https://res.cloudinary.com/dhznjbcys/image/upload/v1762033914/Logo_e72gnr.png" 
            alt="BZR Logo" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
            The Bazaars Blockchain Explorer
          </h1>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Address / Txn Hash / Block (Coming Soon)"
                disabled
                className="w-full p-4 rounded-lg text-lg bg-white placeholder-gray-400 text-gray-500 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-not-allowed"
              />
              <button
                disabled
                className="absolute right-2.5 top-2.5 p-2.5 rounded-lg bg-blue-100 cursor-not-allowed"
              >
                <Search className="w-6 h-6 text-blue-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-8">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
          {/* --- Loading, Error, and Content --- */}
          {loading && <LoadingSpinner />}
          {error && !loading && <ErrorMessage message={error.message} />}
          
          {!loading && !error && info && (
            <div>
              {/* --- Stats Overview Cards --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-[50px]">
              <StatCard
                title="Token Symbol"
                value={info.tokenSymbol}
                icon={<Box className="w-6 h-6 text-blue-400" />}
              />
              <StatCard
                title="Total Supply"
                value={Number(info.formattedTotalSupply).toLocaleString()}
                icon={<HardDrive className="w-6 h-6 text-blue-400" />}
              />
              <StatCard
                title="Total Holders (All Chains)"
                value={stats?.totalHolders.toLocaleString() || '0'}
                icon={<Layers className="w-6 h-6 text-blue-400" />}
              />
            </div>

            {/* --- Navigation Tabs --- */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
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
                  title="Analytics & Holders"
                  icon={<BarChart2 />}
                  isActive={activeTab === 'analytics'}
                  onClick={() => setActiveTab('analytics')}
                />
              </nav>
            </div>

            {/* --- Tab Content --- */}
            <div>
              {/* --- Transfers Tab --- */}
              {activeTab === 'transfers' && (
                <div className="bg-white shadow-xl rounded-lg overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Latest Aggregated Transfers</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {visibleTransfers.length > 0 ? (
                      visibleTransfers.map((tx) => (
                        <div 
                          key={tx.hash} 
                          className="group p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 md:space-x-4 hover:bg-gray-50 cursor-pointer transition-all duration-200"
                          onClick={() => setSelectedTransaction(tx)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                              <Box className="w-5 h-5 text-gray-600 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-blue-600 group-hover:text-blue-700 truncate w-40 md:w-auto transition-colors">
                                Hash: {truncateHash(tx.hash, 10, 8)}
                              </p>
                              <p className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">
                                {timeAgo(tx.timeStamp)}
                              </p>
                            </div>
                          </div>
                          <div className="w-full md:w-auto">
                            <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors">
                              From: <span className="text-blue-600 group-hover:text-blue-700 transition-colors">
                                {truncateHash(tx.from)}
                              </span>
                            </p>
                            <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors">
                              To: <span className="text-blue-600 group-hover:text-blue-700 transition-colors">
                                {truncateHash(tx.to)}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                             <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {formatValue(tx.value, tx.tokenDecimal)} {tx.tokenSymbol}
                            </span>
                            <span className="text-xs font-mono py-0.5 px-2 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                              {tx.chainName}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-6 text-center text-gray-400">No transfers found.</p>
                    )}
                  </div>
                  {transfers && transfers.length > 15 && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
                      <button
                        onClick={() => setShowAllTransfers(!showAllTransfers)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all"
                      >
                        {showAllTransfers ? 'Show Less' : 'View All Transfers'}
                      </button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white shadow-xl rounded-lg p-6 transform transition-all duration-300 hover:shadow-2xl hover:shadow-blue-200/50">
                    <div className="border-b border-gray-200 pb-4 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Token Details</h3>
                      <p className="text-sm text-gray-500 mt-1">Basic information about the BZR token</p>
                    </div>
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <span className="text-sm text-gray-500">Token Name</span>
                        <p className="text-lg font-semibold text-gray-900 mt-1">{info.tokenName}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <span className="text-sm text-gray-500">Token Symbol</span>
                        <p className="text-lg font-semibold text-gray-900 mt-1">{info.tokenSymbol}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <span className="text-sm text-gray-500">Decimals</span>
                        <p className="text-lg font-semibold text-gray-900 mt-1">{info.tokenDecimal}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <span className="text-sm text-gray-500">Total Supply</span>
                        <div className="flex items-baseline mt-1">
                          <p className="text-lg font-semibold text-gray-900">
                            {Number(info.formattedTotalSupply).toLocaleString()}
                          </p>
                          <span className="ml-2 text-sm text-gray-500">{info.tokenSymbol}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white shadow-xl rounded-lg p-6 transform transition-all duration-300 hover:shadow-2xl hover:shadow-blue-200/50">
                    <div className="border-b border-gray-200 pb-4 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Contract Links</h3>
                      <p className="text-sm text-gray-500 mt-1">View contract on different blockchain explorers</p>
                    </div>
                    <div className="grid gap-2">
                      {contractLinks.map((link) => (
                        <a
                          key={link.name}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex justify-between items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 hover:scale-[1.02]"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-3 group-hover:bg-blue-900/50 transition-colors">
                              <span className="text-sm font-medium text-gray-300 group-hover:text-blue-300 transition-colors">
                                {link.name.substring(0, 2)}
                              </span>
                            </div>
                            <span className="text-gray-300 group-hover:text-white transition-colors">
                              {link.name}
                            </span>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* --- Analytics & Holders Tab --- */}
              {activeTab === 'analytics' && (
                <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-100">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Pro Feature</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>Holder analytics is available with a Pro subscription. Contact us to learn more.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Holder Analytics</h3>
                      <p className="text-sm text-gray-500 mt-1">Real-time holder statistics across all chains</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        Pro Feature
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                    <div className="py-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-md font-semibold text-gray-900">Holders by Chain</h4>
                        <button
                          onClick={() => alert('This feature requires a pro subscription')}
                          className="flex items-center text-sm text-blue-600 hover:text-blue-700 transition-colors px-3 py-1 rounded-lg hover:bg-blue-50"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Upgrade to Pro
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {stats?.chains.map((chain) => (
                          <ChainHolderStat
                            key={chain.chainId}
                            chainName={chain.chainName}
                            holderCount={chain.holderCount}
                            isLoading={chain.isLoading}
                            error={chain.error}
                            onRetry={() => retryChain(chain.chainId)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

