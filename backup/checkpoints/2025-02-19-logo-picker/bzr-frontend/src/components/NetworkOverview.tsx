import { Info, Layers, RefreshCw } from 'lucide-react';
import type { TokenInfo } from '../types/api';

interface NetworkOverviewProps {
  contractLinksCount: number;
  totalHolders: number;
  activeChainsCount: number;
  tokenInfo: TokenInfo | null;
  loading: boolean;
  errorMessage?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const formatSupply = (rawSupply: string | null | undefined): string => {
  if (!rawSupply) return '—';

  try {
    const numberValue = Number(rawSupply);
    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      return '—';
    }
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numberValue);
  } catch (error) {
    console.warn('[NetworkOverview] Failed to format supply:', error);
    return '—';
  }
};

export const NetworkOverview: React.FC<NetworkOverviewProps> = ({
  contractLinksCount,
  totalHolders,
  activeChainsCount,
  tokenInfo,
  loading,
  errorMessage,
  onRefresh,
  refreshing,
}) => {
  const isInitialLoading = loading && (!tokenInfo || !tokenInfo.tokenName);
  const showErrorState = !isInitialLoading && (!tokenInfo || !tokenInfo.tokenName);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Token Details */}
      <div className="bg-white shadow-xl rounded-lg p-4 md:p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Token Details</h3>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={Boolean(refreshing)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh token info"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'text-gray-400 animate-spin' : 'text-gray-500'}`} />
              <span className="sr-only">Refresh token info</span>
            </button>
          )}
        </div>

        {isInitialLoading ? (
          <div className="space-y-2 md:space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-2 md:p-3 rounded-lg bg-gray-50 border border-gray-200 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-5 bg-gray-200 rounded w-32" />
              </div>
            ))}
          </div>
        ) : showErrorState ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 mb-2">{errorMessage || 'Unable to load token information'}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={Boolean(refreshing)}
                className="text-xs text-red-600 hover:text-red-700 underline disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {refreshing ? 'Retrying…' : 'Try again'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 md:space-y-3">
            <div className="p-2 md:p-3 rounded-lg bg-gradient-to-r from-blue-50 to-white border border-blue-100">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Name</span>
              <p className="text-base md:text-lg font-semibold text-gray-900 mt-1">
                {tokenInfo?.tokenName ?? '—'}
              </p>
            </div>
            <div className="p-2 md:p-3 rounded-lg bg-gradient-to-r from-purple-50 to-white border border-purple-100">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Symbol</span>
              <p className="text-base md:text-lg font-semibold text-gray-900 mt-1">
                {tokenInfo?.tokenSymbol ?? '—'}
              </p>
            </div>
            <div className="p-2 md:p-3 rounded-lg bg-gradient-to-r from-green-50 to-white border border-green-100">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Decimals</span>
              <p className="text-base md:text-lg font-semibold text-gray-900 mt-1">
                {typeof tokenInfo?.tokenDecimal === 'number' ? tokenInfo.tokenDecimal : '—'}
              </p>
            </div>
            <div className="p-2 md:p-3 rounded-lg bg-gradient-to-r from-orange-50 to-white border border-orange-100">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Total Supply</span>
              <div className="flex items-baseline mt-1 flex-wrap gap-2">
                <p className="text-base md:text-lg font-bold text-gray-900">
                  {formatSupply(tokenInfo?.formattedTotalSupply ?? tokenInfo?.totalSupply)}
                </p>
                {tokenInfo?.tokenSymbol && (
                  <span className="text-sm md:text-base text-gray-600 font-medium">
                    {tokenInfo.tokenSymbol}
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 md:p-3 rounded-lg bg-gradient-to-r from-red-50 to-white border border-red-100">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Max Supply</span>
              <div className="flex items-baseline mt-1 flex-wrap gap-2">
                <p className="text-base md:text-lg font-bold text-gray-900">
                  555,555,555
                </p>
                <span className="text-sm md:text-base text-gray-600 font-medium">
                  BZR
                </span>
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
              {totalHolders > 0 ? totalHolders.toLocaleString() : '—'}
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
