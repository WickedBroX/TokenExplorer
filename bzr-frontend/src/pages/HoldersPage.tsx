import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useHolders } from "../hooks/api/useHolders";
import { useTokenPrice } from "../hooks/api/useTokenPrice";
import { useTransfers } from "../hooks/api/useTransfers";
import { HoldersTab } from "../components/HoldersTab";
import { exportHoldersToCSV } from "../utils/exportUtils";
import {
  getExplorerUrl,
  truncateHash,
  formatUsdValue,
} from "../utils/formatters";

export const HoldersPage: React.FC = () => {
  const [chainId, setChainId] = useState(137); // Default to Polygon
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [holderSearch, setHolderSearch] = useState("");
  const [chainChanging, setChainChanging] = useState(false);

  const {
    data: holdersData,
    isLoading: loadingHolders,
    error: holdersError,
    refetch: refreshHolders,
  } = useHolders({
    chainId,
    page,
    pageSize,
    search: holderSearch || undefined,
  });

  const { data: tokenPrice } = useTokenPrice();

  // Fetch available chains from transfers endpoint (exclude "All Chains" option)
  const { data: transfersData } = useTransfers({
    chainId: 0,
    page: 1,
    pageSize: 1,
  });
  const availableChains = [
    { id: 0, name: "All Chains" },
    ...(transfersData?.availableChains || [])
      .filter((chain) => chain.id !== 0)
      .sort((a, b) => {
        // Show Polygon (137) first
        if (a.id === 137) return -1;
        if (b.id === 137) return 1;
        return 0;
      }),
  ];

  const holders = chainChanging || loadingHolders ? [] : holdersData?.data || [];

  // Load holders when the page mounts
  useEffect(() => {
    // React Query handles fetching automatically, but if we need manual refresh on mount:
    // refreshHolders();
  }, []);

  // Reset pagination when chain changes
  useEffect(() => {
    setPage(1);
    setChainChanging(true);
  }, [chainId, pageSize]);

  // Reset pagination when search changes to avoid empty pages after a narrow filter
  useEffect(() => {
    setPage(1);
  }, [holderSearch]);

  // Clear chain-changing flag once new data arrives
  useEffect(() => {
    if (!loadingHolders) {
      setChainChanging(false);
    }
  }, [loadingHolders, holdersData]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1 id="holders-title" className="text-2xl font-bold text-gray-900 scroll-mt-24">Token Holders</h1>
          <p className="text-sm text-gray-500">
            Real-time list of BZR token holders across chains
          </p>
        </div>
      </div>

      <HoldersTab
        holders={loadingHolders ? [] : holders}
        holdersChainId={chainId}
        holdersPage={page}
        holdersPageSize={pageSize}
        holdersPagination={holdersData?.pagination}
        holdersSupply={holdersData?.supply}
        loadingHolders={loadingHolders}
        holdersError={holdersError ? { message: holdersError.message } : null}
        holderSearch={holderSearch}
        tokenPrice={tokenPrice || null}
        availableChains={availableChains}
        setHoldersChainId={setChainId}
        setHoldersPageSize={setPageSize}
        setHoldersPage={setPage}
        setHolderSearch={setHolderSearch}
        refreshHolders={refreshHolders}
        exportHoldersToCSV={exportHoldersToCSV}
        getExplorerUrl={getExplorerUrl}
        truncateHash={truncateHash}
        formatUsdValue={formatUsdValue}
      />
    </div>
  );
};
