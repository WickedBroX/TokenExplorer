import React, { useEffect, useRef, useCallback } from 'react';
import { Info } from 'lucide-react';
import { useTokenInfo } from '../hooks/api/useTokenInfo';
import { useTokenStats } from '../hooks/api/useTokenStats';
import { ContractAddresses } from '../components/ContractAddresses';
import { CommunityLinks } from '../components/CommunityLinks';
import { MarketData } from '../components/MarketData';

const BZR_TOKEN_ADDRESS = '0x85Cb098bdcD3Ca929d2cD18Fc7A2669fF0362242';

export const InfoPage: React.FC = () => {
  const { 
    data: info, 
    isLoading: loadingInfo, 
    refetch: refetchInfo, 
    isFetching: fetchingInfo 
  } = useTokenInfo();

  const { 
    refetch: refetchStats, 
    isFetching: fetchingStats 
  } = useTokenStats();

  const refresh = useCallback(() => {
    refetchInfo();
    refetchStats();
  }, [refetchInfo, refetchStats]);

  const refreshing = fetchingInfo || fetchingStats;

  const infoAutoRefreshAttempted = useRef(false);

  // Auto-refresh info when switching to Info tab if data is missing
  useEffect(() => {
    if (!infoAutoRefreshAttempted.current && (!info || !info.tokenName) && !loadingInfo && !refreshing) {
      console.log('[Info Page] Auto-refreshing missing token info');
      infoAutoRefreshAttempted.current = true;
      refresh();
    }
  }, [info, loadingInfo, refreshing, refresh]);

  return (
    <div>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg text-blue-600">
          <Info className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Info & Contract</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left column - Market Data & Community (takes 2 columns on large screens) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <MarketData />
          <CommunityLinks />
        </div>
        
        {/* Right column - Contract Addresses (takes 1 column) */}
        <div>
          <ContractAddresses tokenAddress={BZR_TOKEN_ADDRESS} />
        </div>
      </div>
    </div>
  );
};
