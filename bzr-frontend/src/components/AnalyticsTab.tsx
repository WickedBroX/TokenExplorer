import * as React from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Activity, TrendingUp, Users, BarChart2 } from 'lucide-react';

interface AnalyticsTabProps {
  analyticsData: {
    dailyData: Array<{
      date: string;
      displayDate: string;
      count: number;
      volume: number;
      uniqueAddresses: number;
    }>;
    analyticsMetrics: {
      totalTransfers: number;
      totalVolume: number;
      avgTransferSize: number;
      activeAddresses: number;
    };
  };
  analyticsTimeRange: '7d' | '30d' | '90d' | 'all';
  setAnalyticsTimeRange: (range: '7d' | '30d' | '90d' | 'all') => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ 
  analyticsData, 
  analyticsTimeRange, 
  setAnalyticsTimeRange 
}) => {
  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Transfer Analytics</h3>
            <p className="text-sm text-gray-500 mt-1">Comprehensive transfer activity insights</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setAnalyticsTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  analyticsTimeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-900">Total Transfers</p>
          </div>
          <p className="text-3xl font-bold text-blue-900">{analyticsData.analyticsMetrics.totalTransfers.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <p className="text-sm font-medium text-purple-900">Total Volume</p>
          </div>
          <p className="text-3xl font-bold text-purple-900">{analyticsData.analyticsMetrics.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-purple-700 mt-1">BZR</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-green-900">Avg Transfer</p>
          </div>
          <p className="text-3xl font-bold text-green-900">{analyticsData.analyticsMetrics.avgTransferSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-green-700 mt-1">BZR</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-orange-600" />
            <p className="text-sm font-medium text-orange-900">Active Addresses</p>
          </div>
          <p className="text-3xl font-bold text-orange-900">{analyticsData.analyticsMetrics.activeAddresses.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Transfer Count Chart */}
        <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-100">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Transfer Activity
          </h4>
          {analyticsData.dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.dailyData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number) => [value, 'Transfers']}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No transfer data available for this time range
            </div>
          )}
        </div>

        {/* Volume Chart */}
        <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-100">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Transfer Volume
          </h4>
          <p className="text-sm text-gray-500 mb-4">Daily transfer volume in BZR</p>
          {analyticsData.dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}K` : value}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number) => [value.toLocaleString() + ' BZR', 'Volume']}
                />
                <Bar 
                  dataKey="volume" 
                  fill="#8b5cf6"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No volume data available for this time range
            </div>
          )}
        </div>
      </div>

      {/* Additional Insights */}
      <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-100">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600" />
          Address Activity
        </h4>
        <p className="text-sm text-gray-500 mb-4">Unique addresses participating daily</p>
        {analyticsData.dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={analyticsData.dailyData}>
              <defs>
                <linearGradient id="colorAddresses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
                formatter={(value: number) => [value, 'Unique Addresses']}
              />
              <Area 
                type="monotone" 
                dataKey="uniqueAddresses" 
                stroke="#10b981" 
                strokeWidth={2}
                fill="url(#colorAddresses)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-gray-400">
            No address data available for this time range
          </div>
        )}
      </div>
    </div>
  );
};
