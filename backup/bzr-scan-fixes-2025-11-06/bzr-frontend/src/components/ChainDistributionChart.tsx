import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

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

const RADIAN = Math.PI / 180;

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

  const renderCustomizedLabel = (props: PieLabelRenderProps) => {
    const {
      cx = 0,
      cy = 0,
      midAngle = 0,
      innerRadius = 0,
      outerRadius = 0,
      percent = 0,
      index = 0
    } = props;

    const centerX = typeof cx === 'number' ? cx : Number(cx) || 0;
    const centerY = typeof cy === 'number' ? cy : Number(cy) || 0;
    const angle = typeof midAngle === 'number' ? midAngle : Number(midAngle) || 0;
    const inner = typeof innerRadius === 'number' ? innerRadius : Number(innerRadius) || 0;
    const outer = typeof outerRadius === 'number' ? outerRadius : Number(outerRadius) || 0;
    const slicePercent = typeof percent === 'number' ? percent : Number(percent) || 0;
    const sliceIndex = typeof index === 'number' ? index : Number(index) || 0;

  const radius = inner + (outer - inner) * 0.55;
  const x = centerX + radius * Math.cos(-angle * RADIAN);
  const y = centerY + radius * Math.sin(-angle * RADIAN);
    const chain = sliceIndex != null ? data[sliceIndex]?.chain ?? '' : '';
    const percentageLabel = `${(slicePercent * 100).toFixed(1)}%`;

    return (
      <text
        x={x}
        y={y}
        fill="#111827"
  textAnchor={x > centerX ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
        className="drop-shadow"
      >
        {chain ? `${chain}: ${percentageLabel}` : percentageLabel}
      </text>
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
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {data.map((entry, index) => (
          <div
            key={`${entry.chain}-legend`}
            className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 shadow-sm"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm font-semibold text-gray-900">{entry.chain}</span>
            <span className="text-xs font-medium text-gray-500">{entry.percentage}%</span>
          </div>
        ))}
      </div>

      {/* Summary table */}
      <div className="mt-6 space-y-2">
        <p className="text-sm font-medium text-gray-400 mb-3">Top Chains</p>
        {data.slice(0, 5).map((chain, index) => (
          <div
            key={chain.chain}
            className="flex items-center justify-between text-sm rounded-lg bg-white/90 px-3 py-2 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-gray-900 font-semibold">{chain.chain}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{chain.count.toLocaleString()}</span>
              <span className="text-blue-600 font-semibold">{chain.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
