import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ChainData {
  chain: string;
  count: number;
  volume: number;
  percentage: string;
  [key: string]: string | number;
}

interface ChainDistributionChartProps {
  data: ChainData[];
  loading?: boolean;
}

const COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#6366F1', // Indigo
];

export function ChainDistributionChart({ data, loading = false }: ChainDistributionChartProps) {
  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-700/50 rounded" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Chain Distribution</h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
          No chain data available
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; payload: ChainData }> }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold mb-2">{data.chain}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Transfers:</span>
            <span className="text-white font-medium">{data.count.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Volume:</span>
            <span className="text-white font-medium">{data.volume.toLocaleString()} BZR</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Share:</span>
            <span className="text-white font-medium">{data.percentage}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Chain Distribution</h3>
      <p className="text-sm text-gray-400 mb-4">Transfer activity across different chains</p>
      
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }: { name?: string; percent?: number }) => 
              `${name}: ${((percent || 0) * 100).toFixed(1)}%`
            }
            outerRadius={100}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary table */}
      <div className="mt-6 space-y-2">
        <p className="text-sm font-medium text-gray-400 mb-3">Top Chains</p>
        {data.slice(0, 5).map((chain, index) => (
          <div key={chain.chain} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-white">{chain.chain}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400">{chain.count.toLocaleString()}</span>
              <span className="text-blue-400 font-medium">{chain.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
