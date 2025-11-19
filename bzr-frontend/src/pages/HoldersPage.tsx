import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useTokenData } from '../hooks/useTokenData';
import { HoldersTab } from '../components/HoldersTab';
import { exportHoldersToCSV } from '../utils/exportUtils';
import { getExplorerUrl, truncateHash, formatUsdValue } from '../utils/formatters';

export const HoldersPage: React.FC = () => {
  const {
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
    availableChains,
    tokenPrice,
  } = useTokenData();

  const [holderSearch, setHolderSearch] = useState('');

  // Load holders when the page mounts
  useEffect(() => {
    if (holders.length === 0 && !loadingHolders && !holdersError) {
      refreshHolders();
    }
  }, [holders.length, loadingHolders, holdersError, refreshHolders]);

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
        holdersChainId={holdersChainId}
        holdersPage={holdersPage}
        holdersPageSize={holdersPageSize}
        loadingHolders={loadingHolders}
        holdersError={holdersError}
        holderSearch={holderSearch}
        tokenPrice={tokenPrice}
        availableChains={availableChains}
        setHoldersChainId={setHoldersChainId}
        setHoldersPage={setHoldersPage}
        setHoldersPageSize={setHoldersPageSize}
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
