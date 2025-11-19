import React, { useState } from 'react';
import { 
  Search, Download, Copy, Check, RefreshCw 
} from 'lucide-react';
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
  setHoldersPageSize: (size: number) => void;
  setHolderSearch: (search: string) => void;
  refreshHolders: () => void;
  exportHoldersToCSV: (holders: Holder[], chainName: string) => void;
  getExplorerUrl: (chainName: string, address: string, type: 'tx' | 'address') => string;
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

  const chainName = availableChains.find(c => c.id === holdersChainId)?.name || 'Unknown Chain';

  // Filter client-side if search is active
  const filteredHolders = holders.filter(holder =>
    holder.TokenHolderAddress.toLowerCase().includes(holderSearch.toLowerCase())
  );

  // Sort by balance (highest to lowest)
  const sortedHolders = [...filteredHolders].sort((a, b) => {
    const balanceA = parseFloat(a.TokenHolderQuantity);
    const balanceB = parseFloat(b.TokenHolderQuantity);
    return balanceB - balanceA;
  });

  return (
    <div className="space-y-6">
      
      {/* Main Content Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between gap-4">
          {/* Search & Chain */}
          <div className="flex flex-1 gap-3">
             <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Filter by address..."
                  value={holderSearch}
                  onChange={(e) => setHolderSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
             </div>
             <select
                value={holdersChainId}
                onChange={(e) => setHoldersChainId(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              >
                {availableChains.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
             <button 
               onClick={refreshHolders}
               disabled={loadingHolders}
               className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
               title="Refresh List"
             >
               <RefreshCw className={`w-4 h-4 ${loadingHolders ? 'animate-spin' : ''}`} />
             </button>
             <button 
               onClick={() => exportHoldersToCSV(sortedHolders, chainName)}
               className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
             >
               <Download className="w-4 h-4" />
               <span className="hidden sm:inline">CSV</span>
             </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 w-16">Rank</th>
                <th className="px-6 py-3">Address</th>
                <th className="px-6 py-3 text-right">Quantity</th>
                <th className="px-6 py-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingHolders ? (
                // Skeleton Loader
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-8 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-48 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : holdersError ? (
                <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-red-500">
                      Error loading holders: {typeof holdersError === 'string' ? holdersError : holdersError.message}
                   </td>
                </tr>
              ) : sortedHolders.length === 0 ? (
                <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No holders found matching your criteria.
                   </td>
                </tr>
              ) : (
                sortedHolders.map((holder, index) => {
                  const balance = parseFloat(holder.TokenHolderQuantity) / 1e18;
                  const valueUsd = tokenPrice?.priceUsd ? balance * tokenPrice.priceUsd : 0;
                  const rank = (holdersPage - 1) * holdersPageSize + index + 1;

                  return (
                    <tr key={holder.TokenHolderAddress} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 text-gray-500 font-mono">
                        {rank}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <a 
                             href={getExplorerUrl(chainName, holder.TokenHolderAddress, 'address')}
                             target="_blank"
                             rel="noreferrer"
                             className="text-blue-600 font-mono hover:text-blue-800 hover:underline truncate max-w-[150px] sm:max-w-[200px]"
                           >
                             {truncateHash(holder.TokenHolderAddress)}
                           </a>
                           <button 
                             onClick={() => handleCopyAddress(holder.TokenHolderAddress)}
                             className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-600"
                           >
                             {copiedAddress === holder.TokenHolderAddress ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                           </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
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
        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
           <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show</span>
              <select 
                value={holdersPageSize}
                onChange={(e) => setHoldersPageSize(Number(e.target.value))}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-600">per page</span>
           </div>
        </div>
      </div>
    </div>
  );
};
