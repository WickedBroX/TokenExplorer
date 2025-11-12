import { ExternalLink, TrendingUp } from 'lucide-react';

interface WhaleTransfer {
  hash: string;
  from: string;
  to: string;
  value: number;
  timeStamp: number;
  chain: string;
}

interface TopMoversTableProps {
  data: WhaleTransfer[];
  loading?: boolean;
}

export function TopMoversTable({ data, loading = false }: TopMoversTableProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = Date.now();
    const diff = now - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-700/50 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Top Whale Transfers</h3>
        <div className="flex items-center justify-center h-48 text-gray-400">
          No large transfers detected
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-400" />
            Top Whale Transfers
          </h3>
          <p className="text-sm text-gray-400 mt-1">Largest transfers (&gt; 1M BZR)</p>
        </div>
        <span className="text-sm text-gray-400 bg-gray-700/50 px-3 py-1 rounded">
          {data.length} whales
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
                Rank
              </th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
                Amount
              </th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
                From
              </th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
                To
              </th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
                Chain
              </th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
                Time
              </th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">
                Tx
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {data.map((transfer, index) => (
              <tr
                key={transfer.hash}
                className="hover:bg-gray-700/30 transition-colors"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className={`
                      text-sm font-semibold
                      ${index === 0 ? 'text-yellow-400' : 
                        index === 1 ? 'text-gray-300' : 
                        index === 2 ? 'text-orange-400' : 
                        'text-gray-400'}
                    `}>
                      #{index + 1}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-col">
                    <span className="text-white font-semibold">
                      {transfer.value.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400">BZR</span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <code className="text-xs bg-gray-700/50 px-2 py-1 rounded text-blue-400">
                    {formatAddress(transfer.from)}
                  </code>
                </td>
                <td className="py-3 pr-4">
                  <code className="text-xs bg-gray-700/50 px-2 py-1 rounded text-green-400">
                    {formatAddress(transfer.to)}
                  </code>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                    {transfer.chain}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-sm text-gray-400">
                    {formatTime(transfer.timeStamp)}
                  </span>
                </td>
                <td className="py-3">
                  <a
                    href={`https://etherscan.io/tx/${transfer.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
