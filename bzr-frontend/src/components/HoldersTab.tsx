import React, { useState } from 'react';
import { 
  Users, Trophy, TrendingUp, Activity, BarChart2, Download, 
  ExternalLink, AlertTriangle, Copy, Check, ChevronDown, ChevronUp,
  Filter, X
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Holder } from '../types/api';

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
  setHoldersPage: (page: number) => void;
  setHoldersPageSize: (size: number) => void;
  setHolderSearch: (search: string) => void;
  refreshHolders: () => void;
  exportHoldersToCSV: (holders: Holder[], chainName: string) => void;
  getExplorerUrl: (chainName: string, address: string, type: 'tx' | 'address') => string;
  truncateHash: (hash: string, start?: number, end?: number) => string;
  formatUsdValue: (value: number) => string;
}

const MAX_SUPPLY = 555555555;

// Tier definitions
const getTier = (balance: number): { name: string; icon: string; gradient: string; badge: string } => {
  if (balance >= 1000000) {
    return { 
      name: 'Whale', 
      icon: '🐋', 
      gradient: 'from-green-600 to-green-500',
      badge: 'bg-gradient-to-r from-green-600 to-green-500'
    };
  } else if (balance >= 100000) {
    return { 
      name: 'Large Holder', 
      icon: '🦈', 
      gradient: 'from-green-500 to-green-500',
      badge: 'bg-green-500'
    };
  } else if (balance >= 10000) {
    return { 
      name: 'Medium Holder', 
      icon: '🐬', 
      gradient: 'from-green-400 to-green-400',
      badge: 'bg-green-400'
    };
  } else {
    return { 
      name: 'Small Holder', 
      icon: '🐟', 
      gradient: 'from-gray-500 to-gray-500',
      badge: 'bg-gray-500'
    };
  }
};

// Podium rank colors
const getPodiumStyle = (rank: number) => {
  if (rank === 1) return { gradient: 'from-yellow-400 via-yellow-500 to-orange-500', medal: '🥇', ring: 'ring-yellow-400' };
  if (rank === 2) return { gradient: 'from-gray-300 via-gray-400 to-gray-500', medal: '🥈', ring: 'ring-gray-400' };
  if (rank === 3) return { gradient: 'from-orange-300 via-orange-400 to-orange-600', medal: '🥉', ring: 'ring-orange-400' };
  return { gradient: 'from-gray-100 to-gray-200', medal: '', ring: 'ring-gray-300' };
};

export const HoldersTab: React.FC<HoldersTabProps> = ({
  holders,
  holdersChainId,
  loadingHolders,
  holdersError,
  holderSearch,
  tokenPrice,
  availableChains,
  setHoldersChainId,
  setHolderSearch,
  refreshHolders,
  exportHoldersToCSV,
  getExplorerUrl,
  truncateHash,
  formatUsdValue,
}) => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set(['Whale', 'Large Holder']));

  // Filter holders by search
  const filteredHolders = holders.filter(holder =>
    holder.TokenHolderAddress.toLowerCase().includes(holderSearch.toLowerCase())
  );

  // Calculate holder data
  const holdersWithBalance = filteredHolders.map(holder => ({
    ...holder,
    balance: parseFloat(holder.TokenHolderQuantity) / Math.pow(10, 18),
  }));

  // Further filter by selected tier
  const tierFilteredHolders = selectedTier
    ? holdersWithBalance.filter(h => getTier(h.balance).name === selectedTier)
    : holdersWithBalance;

  const chainName = availableChains.find(c => c.id === holdersChainId)?.name || '';

  // Calculate concentration metrics
  const totalBalance = holdersWithBalance.reduce((sum, h) => sum + h.balance, 0);
  const sortedByBalance = [...holdersWithBalance].sort((a, b) => b.balance - a.balance);
  
  const top1Count = Math.max(1, Math.ceil(sortedByBalance.length * 0.01));
  const top5Count = Math.max(1, Math.ceil(sortedByBalance.length * 0.05));
  const top10Count = Math.max(1, Math.ceil(sortedByBalance.length * 0.10));
  
  const top1Balance = sortedByBalance.slice(0, top1Count).reduce((sum, h) => sum + h.balance, 0);
  const top5Balance = sortedByBalance.slice(0, top5Count).reduce((sum, h) => sum + h.balance, 0);
  const top10Balance = sortedByBalance.slice(0, top10Count).reduce((sum, h) => sum + h.balance, 0);
  
  const top1Percentage = totalBalance > 0 ? (top1Balance / totalBalance) * 100 : 0;
  const top5Percentage = totalBalance > 0 ? (top5Balance / totalBalance) * 100 : 0;
  const top10Percentage = totalBalance > 0 ? (top10Balance / totalBalance) * 100 : 0;
  
  // Decentralization score (inverse of concentration, 0-100)
  const decentralizationScore = Math.max(0, 100 - top10Percentage);

  // Tier distribution
  const tierCounts = {
    Whale: holdersWithBalance.filter(h => h.balance >= 1000000).length,
    'Large Holder': holdersWithBalance.filter(h => h.balance >= 100000 && h.balance < 1000000).length,
    'Medium Holder': holdersWithBalance.filter(h => h.balance >= 10000 && h.balance < 100000).length,
    'Small Holder': holdersWithBalance.filter(h => h.balance < 10000).length,
  };

  // Pie chart data
  const pieData = [
    { name: 'Whales', value: tierCounts.Whale, color: '#a855f7' },
    { name: 'Large', value: tierCounts['Large Holder'], color: '#3b82f6' },
    { name: 'Medium', value: tierCounts['Medium Holder'], color: '#10b981' },
    { name: 'Small', value: tierCounts['Small Holder'], color: '#6b7280' },
  ];

  // Copy address handler
  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Toggle tier expansion
  const toggleTier = (tierName: string) => {
    const newExpanded = new Set(expandedTiers);
    if (newExpanded.has(tierName)) {
      newExpanded.delete(tierName);
    } else {
      newExpanded.add(tierName);
    }
    setExpandedTiers(newExpanded);
  };

  if (loadingHolders) {
    return (
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-600">Loading holders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (holdersError) {
    return (
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">Error Loading Holders</h4>
              <p className="text-sm text-red-700 mt-1">{holdersError.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (holders.length === 0) {
    return (
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100 p-12">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">No holders found</p>
          <p className="text-sm text-gray-500 mt-2">Try refreshing or selecting a different chain</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <h3 className="text-xl font-bold text-gray-900">Token Holders</h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">Top holders ranked by balance</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={holdersChainId}
              onChange={(e) => setHoldersChainId(Number(e.target.value))}
              className="block rounded-lg border-gray-300 text-sm py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
            >
              {availableChains
                .filter(chain => chain.id !== 0 && chain.id !== 25)
                .map(chain => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={() => exportHoldersToCSV(filteredHolders, chainName)}
              disabled={filteredHolders.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
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

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Filter Options</h4>
              <button
                onClick={() => {
                  setSelectedTier(null);
                  setHolderSearch('');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Whale', 'Large Holder', 'Medium Holder', 'Small Holder'].map(tier => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(selectedTier === tier ? null : tier)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTier === tier
                      ? getTier(tier === 'Whale' ? 1000000 : tier === 'Large Holder' ? 100000 : tier === 'Medium Holder' ? 10000 : 1000).badge + ' text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getTier(tier === 'Whale' ? 1000000 : tier === 'Large Holder' ? 100000 : tier === 'Medium Holder' ? 10000 : 1000).icon} {tier} ({tierCounts[tier as keyof typeof tierCounts]})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by holder address..."
            value={holderSearch}
            onChange={(e) => setHolderSearch(e.target.value)}
            className="w-full px-4 py-3 pl-10 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {(holderSearch || selectedTier) && (
          <p className="text-sm text-gray-600 mt-2">
            Showing {tierFilteredHolders.length} of {holders.length} holders
            {selectedTier && ` (${selectedTier}s only)`}
          </p>
        )}
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Top 3 Podium */}
        {sortedByBalance.length >= 3 && (
          <div>
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Top 3 Holders
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sortedByBalance.slice(0, 3).map((holder, index) => {
                const rank = index + 1;
                const style = getPodiumStyle(rank);
                const percentage = (holder.balance / MAX_SUPPLY) * 100;
                const usdValue = tokenPrice?.priceUsd && holder.balance ? holder.balance * tokenPrice.priceUsd : null;
                const tier = getTier(holder.balance);

                return (
                  <div
                    key={holder.TokenHolderAddress}
                    className={`relative bg-white rounded-xl p-6 shadow-lg border-2 ${style.ring} transform transition-all hover:scale-105 hover:shadow-xl`}
                  >
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-5xl">{style.medal}</span>
                        <span className={`text-xs px-2 py-1 ${tier.badge} text-white rounded-full font-semibold`}>
                          {tier.name}
                        </span>
                      </div>
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-1">Address</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-gray-900 font-medium">
                            {truncateHash(holder.TokenHolderAddress, 6, 4)}
                          </span>
                          <button
                            onClick={() => handleCopyAddress(holder.TokenHolderAddress)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Copy address"
                          >
                            {copiedAddress === holder.TokenHolderAddress ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-600" />
                            )}
                          </button>
                          <a
                            href={getExplorerUrl(chainName, holder.TokenHolderAddress, 'address')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 text-blue-600" />
                          </a>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-gray-500">Balance</div>
                          <div className="text-2xl font-bold text-gray-900">
                            {holder.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-xs text-gray-500">BZR</div>
                        </div>
                        {usdValue !== null && (
                          <div>
                            <div className="text-xs text-gray-500">USD Value</div>
                            <div className="text-lg font-semibold text-green-600">
                              {formatUsdValue(usdValue)}
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">% of Max Supply</div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-700 mt-1 font-semibold">
                            {percentage.toFixed(4)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Concentration Metrics + Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metrics Cards */}
          <div className="lg:col-span-2">
            <h4 className="text-lg font-bold text-gray-900 mb-4">Concentration Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                  <p className="text-sm font-medium text-red-900">Top 1%</p>
                </div>
                <p className="text-3xl font-bold text-red-900">{top1Percentage.toFixed(2)}%</p>
                <p className="text-xs text-red-700 mt-1">{top1Count} holders</p>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="w-5 h-5 text-orange-600" />
                  <p className="text-sm font-medium text-orange-900">Top 5%</p>
                </div>
                <p className="text-3xl font-bold text-orange-900">{top5Percentage.toFixed(2)}%</p>
                <p className="text-xs text-orange-700 mt-1">{top5Count} holders</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900">Top 10%</p>
                </div>
                <p className="text-3xl font-bold text-purple-900">{top10Percentage.toFixed(2)}%</p>
                <p className="text-xs text-purple-700 mt-1">{top10Count} holders</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Decentralization</p>
                </div>
                <p className="text-3xl font-bold text-green-900">{decentralizationScore.toFixed(1)}</p>
                <p className="text-xs text-green-700 mt-1">Health Score</p>
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Holder Distribution</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} holders`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tiered Holder Lists */}
        <div>
          <h4 className="text-lg font-bold text-gray-900 mb-4">All Holders by Tier</h4>
          <div className="space-y-3">
            {(['Whale', 'Large Holder', 'Medium Holder', 'Small Holder'] as const).map(tierName => {
              const tierHolders = tierFilteredHolders.filter(h => getTier(h.balance).name === tierName);
              if (tierHolders.length === 0) return null;
              
              const tier = getTier(tierName === 'Whale' ? 1000000 : tierName === 'Large Holder' ? 100000 : tierName === 'Medium Holder' ? 10000 : 1000);
              const isExpanded = expandedTiers.has(tierName);

              return (
                <div key={tierName} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleTier(tierName)}
                    className={`w-full p-4 bg-gradient-to-r ${tier.gradient} text-white flex items-center justify-between hover:opacity-90 transition-opacity`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{tier.icon}</span>
                      <div className="text-left">
                        <div className="font-bold text-lg">{tierName}s</div>
                        <div className="text-sm opacity-90">{tierHolders.length} holders</div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  
                  {isExpanded && (
                    <div className="bg-white divide-y divide-gray-100">
                      {tierHolders.map((holder) => {
                        const globalRank = sortedByBalance.findIndex(h => h.TokenHolderAddress === holder.TokenHolderAddress) + 1;
                        const percentage = (holder.balance / MAX_SUPPLY) * 100;
                        const usdValue = tokenPrice?.priceUsd && holder.balance ? holder.balance * tokenPrice.priceUsd : null;

                        return (
                          <div key={holder.TokenHolderAddress} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${tier.badge} flex items-center justify-center text-white font-bold text-sm`}>
                                  #{globalRank}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-mono text-gray-900 truncate">
                                      {holder.TokenHolderAddress}
                                    </span>
                                    <button
                                      onClick={() => handleCopyAddress(holder.TokenHolderAddress)}
                                      className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                                    >
                                      {copiedAddress === holder.TokenHolderAddress ? (
                                        <Check className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <Copy className="w-3 h-3 text-gray-600" />
                                      )}
                                    </button>
                                    <a
                                      href={getExplorerUrl(chainName, holder.TokenHolderAddress, 'address')}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                                    >
                                      <ExternalLink className="w-3 h-3 text-blue-600" />
                                    </a>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-gray-600">
                                    <span className="font-semibold text-gray-900">
                                      {holder.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} BZR
                                    </span>
                                    {usdValue !== null && (
                                      <span className="text-green-600 font-semibold">
                                        {formatUsdValue(usdValue)}
                                      </span>
                                    )}
                                    <span className="text-gray-500">{percentage.toFixed(4)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                    <div
                                      className={`bg-gradient-to-r ${tier.gradient} h-1.5 rounded-full transition-all`}
                                      style={{ width: `${Math.min(100, percentage * 10)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
