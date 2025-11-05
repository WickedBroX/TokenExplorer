import { useEffect, useState, useCallback } from 'react';
import { Info, Layers, RefreshCw } from 'lucide-react';

interface TokenInfo {
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenDecimal: number | null;
  totalSupply: string | null;
  formattedTotalSupply: string | null;
  circulatingSupply: string | null;
  formattedCirculatingSupply: string | null;
}

interface NetworkOverviewProps {
  contractLinksCount: number;
  totalHolders: number;
  activeChainsCount: number;
}

export const NetworkOverview: React.FC<NetworkOverviewProps> = ({
  contractLinksCount,
  totalHolders,
  activeChainsCount,
}) => {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchTokenInfo = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/info', {
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: TokenInfo = await response.json();

      // Validate that we got actual data
      if (!data || !data.tokenName) {
        throw new Error('Invalid response: missing token data');
      }

      setTokenInfo(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch token info';
      console.error('[NetworkOverview] Fetch error:', errorMessage);
      setError(errorMessage);
      
      // Auto-retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, delay);
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  // Initial fetch
  useEffect(() => {
    fetchTokenInfo();
  }, [fetchTokenInfo]);

  const handleManualRetry = () => {
    setRetryCount(0);
    fetchTokenInfo();
  };

  // Format the total supply with proper number formatting
  const formatSupply = (supply: string | null): string => {
    if (!supply) return 'N/A';
    try {
      const num = Number(supply);
      if (!Number.isFinite(num) || num === 0) return 'N/A';
      return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Token Details */}
      <div className="bg-white shadow-xl rounded-lg p-4 md:p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Token Details</h3>
          </div>
          {!loading && (
            <button
              onClick={handleManualRetry}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Refresh token info"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {loading && !tokenInfo ? (
          <div className="space-y-2 md:space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-2 md:p-3 rounded-lg bg-gray-50 border border-gray-200 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-32"></div>
              </div>
            ))}
          </div>
        ) : error && !tokenInfo ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 mb-2">Unable to load token information</p>
            <button
              onClick={handleManualRetry}
              className="text-xs text-red-600 hover:text-red-700 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-3">
            <div className="p-2 md:p-3 rounded-lg bg-gradient-to-r from-blue-50 to-white border border-blue-100">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Name</span>
              <p className="text-base md:text-lg font-semibold text-gray-900 mt-1">
                {tokenInfo?.tokenName || 'N/A'}
              </p>
            </div>
            <div className="p-2 md:p-3 rounded-lg bg-gradient-to-r from-purple-50 to-white border border-purple-100">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Symbol</span>
              <p className="text-base md:text-lg font-semibold text-gray-900 mt-1">
                {tokenInfo?.tokenSymbol || 'N/A'}
              </p>
            </div>
            <div className="p-2 md:p-3 rounded-lg bg-gradient-to-r from-green-50 to-white border border-green-100">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Decimals</span>
              <p className="text-base md:text-lg font-semibold text-gray-900 mt-1">
                {tokenInfo?.tokenDecimal ?? 'N/A'}
              </p>
            </div>
            <div className="p-2 md:p-3 rounded-lg bg-gradient-to-r from-orange-50 to-white border border-orange-100">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Total Supply</span>
              <div className="flex items-baseline mt-1 flex-wrap gap-2">
                <p className="text-base md:text-lg font-bold text-gray-900">
                  {formatSupply(tokenInfo?.formattedTotalSupply ?? null)}
                </p>
                {tokenInfo?.tokenSymbol && tokenInfo?.formattedTotalSupply && (
                  <span className="text-sm md:text-base text-gray-600 font-medium">
                    {tokenInfo.tokenSymbol}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cross-Chain Statistics */}
      <div className="bg-white shadow-xl rounded-lg p-4 md:p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Network</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
            <span className="text-sm text-gray-600">Deployed Chains</span>
            <span className="text-lg font-bold text-blue-600">{contractLinksCount}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-100">
            <span className="text-sm text-gray-600">Total Holders</span>
            <span className="text-lg font-bold text-purple-600">
              {totalHolders > 0 ? totalHolders.toLocaleString() : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
            <span className="text-sm text-gray-600">Active Chains</span>
            <span className="text-lg font-bold text-green-600">{activeChainsCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
