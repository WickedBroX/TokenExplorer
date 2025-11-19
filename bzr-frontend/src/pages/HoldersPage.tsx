import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useHolders } from '../hooks/api/useHolders';
import { useTokenPrice } from '../hooks/api/useTokenPrice';
import { useTransfers } from '../hooks/api/useTransfers';
import { HoldersTab } from '../components/HoldersTab';
import { exportHoldersToCSV } from '../utils/exportUtils';
import { getExplorerUrl, truncateHash, formatUsdValue } from '../utils/formatters';

export const HoldersPage: React.FC = () => {
  const [chainId, setChainId] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [holderSearch, setHolderSearch] = useState('');

  const { 
    data: holdersData, 
    isLoading: loadingHolders, 
    error: holdersError, 
    refetch: refreshHolders 
  } = useHolders({
    chainId,
    page,
    pageSize,
  });

  const { data: tokenPrice } = useTokenPrice();
  
  // Fetch available chains from transfers endpoint
  const { data: transfersData } = useTransfers({ chainId: 0, page: 1, pageSize: 1 });
  const availableChains = transfersData?.availableChains || [];

  const holders = holdersData?.data || [];

  // Load holders when the page mounts
  useEffect(() => {
    // React Query handles fetching automatically, but if we need manual refresh on mount:
    // refreshHolders();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
          <Users className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Token Holders</h1>
      </div>

      <HoldersTab
        holders={holders}
        holdersChainId={chainId}
        holdersPage={page}
        holdersPageSize={pageSize}
        loadingHolders={loadingHolders}
        holdersError={holdersError ? { message: holdersError.message } : null}
        holderSearch={holderSearch}
        tokenPrice={tokenPrice || null}
        availableChains={availableChains}
        setHoldersChainId={setChainId}
        setHoldersPage={setPage}
        setHoldersPageSize={setPageSize}
        setHolderSearch={setHolderSearch}
        refreshHolders={refreshHolders}
        exportHoldersToCSV={exportHoldersToCSV}
        getExplorerUrl={getExplorerUrl}
        truncateHash={truncateHash}
        formatUsdValue={formatUsdValue}
        totalSupply={100000000} // 100M BZR total supply
      />
    </div>
  );
};
