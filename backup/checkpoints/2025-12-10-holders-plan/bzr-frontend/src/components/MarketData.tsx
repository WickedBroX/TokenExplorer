import { TrendingUp, ExternalLink, BarChart3 } from 'lucide-react';

interface MarketLink {
  name: string;
  url: string;
  shortName: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: 'chart' | 'trending' | 'analytics';
}

export const MarketData: React.FC = () => {
  const marketLinks: MarketLink[] = [
    {
      name: 'CoinMarketCap',
      url: 'https://coinmarketcap.com/currencies/bazaars/',
      shortName: 'CMC',
      description: 'Track price, market cap & volume',
      color: 'text-blue-600',
      bgColor: 'from-blue-50 to-white',
      borderColor: 'border-blue-100 hover:border-blue-300',
      icon: 'chart',
    },
    {
      name: 'CoinGecko',
      url: 'https://www.coingecko.com/en/coins/bazaars',
      shortName: 'CG',
      description: 'Market data & community stats',
      color: 'text-yellow-600',
      bgColor: 'from-yellow-50 to-white',
      borderColor: 'border-yellow-100 hover:border-yellow-300',
      icon: 'trending',
    },
    {
      name: 'DexScreener',
      url: 'https://dexscreener.com/search?q=BZR',
      shortName: 'DEX',
      description: 'Real-time DEX trading data',
      color: 'text-purple-600',
      bgColor: 'from-purple-50 to-white',
      borderColor: 'border-purple-100 hover:border-purple-300',
      icon: 'analytics',
    },
  ];

  const renderIcon = (icon: string) => {
    switch (icon) {
      case 'chart':
        return <BarChart3 className="w-4 h-4 text-white" />;
      case 'trending':
        return <TrendingUp className="w-4 h-4 text-white" />;
      case 'analytics':
        return (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      default:
        return <TrendingUp className="w-4 h-4 text-white" />;
    }
  };

  const getIconBgColor = (icon: string) => {
    switch (icon) {
      case 'chart':
        return 'bg-blue-600';
      case 'trending':
        return 'bg-yellow-500';
      case 'analytics':
        return 'bg-purple-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-lg p-4 md:p-6 border border-gray-100">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
        <h3 className="text-base md:text-lg font-semibold text-gray-900">Market Data</h3>
      </div>

      {/* Description */}
      <p className="text-xs md:text-sm text-gray-500 mb-4">
        View live prices and trading activity
      </p>

      {/* Market Links */}
      <div className="space-y-3">
        {marketLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group block p-3 md:p-4 rounded-lg bg-gradient-to-r ${link.bgColor} border ${link.borderColor} transition-all duration-200 hover:shadow-lg`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg ${getIconBgColor(link.icon)} flex items-center justify-center shadow-sm flex-shrink-0`}>
                  {renderIcon(link.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm md:text-base font-semibold text-gray-900 group-hover:${link.color} transition-colors`}>
                      {link.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {link.description}
                  </p>
                </div>
              </div>
              <ExternalLink className={`w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:${link.color} transition-colors flex-shrink-0 mt-0.5`} />
            </div>
          </a>
        ))}
      </div>

      {/* Info Card */}
      <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-gray-600">
            Compare prices across multiple platforms for the best trading opportunities
          </p>
        </div>
      </div>
    </div>
  );
};
