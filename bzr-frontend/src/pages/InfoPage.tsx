import React, { useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { useTokenData } from '../hooks/useTokenData';
import { NetworkOverview } from '../components/NetworkOverview';
import { ContractAddresses } from '../components/ContractAddresses';
import { CommunityLinks } from '../components/CommunityLinks';
import { MarketData } from '../components/MarketData';

const BZR_TOKEN_ADDRESS = '0x85Cb098bdcD3Ca929d2cD18Fc7A2669fF0362242';

export const InfoPage: React.FC = () => {
  const {
    info,
    loadingInfo,
    refreshing,
    refresh,
    infoError,
    warmSummaries,
    stats,
    holders,
  } = useTokenData();

  const infoAutoRefreshAttempted = useRef(false);

  // Auto-refresh info when switching to Info tab if data is missing
  useEffect(() => {
    if (!infoAutoRefreshAttempted.current && (!info || !info.tokenName) && !loadingInfo && !refreshing) {
      console.log('[Info Page] Auto-refreshing missing token info');
      infoAutoRefreshAttempted.current = true;
      refresh();
    }
  }, [info, loadingInfo, refreshing, refresh]);

  const activeChainCount = warmSummaries.filter((chain) => chain.status === 'ok').length;
  const totalHolders = stats?.totalHolders ? Number(stats.totalHolders) : holders.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
          <Info className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Info & Contract</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <NetworkOverview
            contractLinksCount={10}
            totalHolders={totalHolders}
            activeChainsCount={activeChainCount}
            tokenInfo={info}
            loading={loadingInfo}
            errorMessage={infoError?.message}
            onRefresh={refresh}
            refreshing={refreshing}
          />
          <MarketData />
        </div>
        <div className="space-y-6">
          <ContractAddresses tokenAddress={BZR_TOKEN_ADDRESS} />
          <CommunityLinks />
        </div>
      </div>
    </div>
  );
};
