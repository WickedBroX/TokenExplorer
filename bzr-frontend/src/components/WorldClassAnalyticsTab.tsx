import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, Activity, RefreshCw } from 'lucide-react';
import { EnhancedMetricCard } from './EnhancedMetricCard';
import { InteractiveChart } from './InteractiveChart';

interface DataPoint {
  date: string;
  transfers: number;
  volume: number;
  activeUsers: number;
}

// Mock Data Generator with realistic patterns
// REPLACE THIS WITH REAL API CALL LATER
const generateMockData = (days: number): DataPoint[] => {
  return Array.from({ length: days }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    
    // Create a trend that increases over time with some variance
    const trendFactor = i / days; // 0 to 1 progression
    const dayVariance = Math.sin(i * 0.5) * 0.2; // Cyclical variance
    
    // Different base values for different time ranges to make them distinguishable
    const baseTransfers = days === 7 ? 300 : days === 30 ? 250 : 200;
    const baseVolume = days === 7 ? 35000 : days === 30 ? 30000 : 25000;
    const baseUsers = days === 7 ? 120 : days === 30 ? 100 : 80;
    
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      transfers: Math.floor(baseTransfers + (baseTransfers * trendFactor * 0.5) + (Math.random() * 100 - 50) + (dayVariance * 100)),
      volume: Math.floor(baseVolume + (baseVolume * trendFactor * 0.3) + (Math.random() * 5000 - 2500) + (dayVariance * 3000)),
      activeUsers: Math.floor(baseUsers + (baseUsers * trendFactor * 0.4) + (Math.random() * 30 - 15) + (dayVariance * 20)),
    };
  });
};

export function WorldClassAnalyticsTab() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DataPoint[]>([]);

  // Simulate Fetch
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    setData(generateMockData(days));
    setLoading(false);
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Header / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          Network Analytics
        </h2>
        
        <div className="flex items-center gap-1.5 sm:gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm w-full sm:w-auto">
           {(['7d', '30d', '90d'] as const).map((range) => (
             <button
               key={range}
               onClick={() => setTimeRange(range)}
               className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                 timeRange === range 
                   ? 'bg-gray-100 text-gray-900 shadow-sm' 
                   : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
               }`}
             >
               {range.toUpperCase()}
             </button>
           ))}
           <div className="w-px h-4 bg-gray-200 mx-0.5 sm:mx-1" />
           <button 
             onClick={fetchAnalytics}
             className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
             title="Refresh Data"
           >
             <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <EnhancedMetricCard
          title="Total Transfers"
          value="124,592"
          change={2.4}
          icon={<BarChart3 className="w-6 h-6" />}
          loading={loading}
          subtitle="Lifetime transactions"
        />
        <EnhancedMetricCard
          title="Transfer Volume"
          value="45.2M BZR"
          change={-0.8}
          icon={<TrendingUp className="w-6 h-6" />}
          loading={loading}
          subtitle={`Last ${timeRange}`}
        />
        <EnhancedMetricCard
          title="Active Addresses"
          value="1,204"
          change={12.5}
          icon={<Users className="w-6 h-6" />}
          loading={loading}
          subtitle="Unique senders/receivers"
        />
        <EnhancedMetricCard
          title="Avg. Transaction"
          value="320 BZR"
          change={0.0}
          icon={<Activity className="w-6 h-6" />}
          loading={loading}
          subtitle="Median transfer size"
        />
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <InteractiveChart
          title="Transaction History"
          data={data}
          xAxisKey="date"
          loading={loading}
          dataKeys={[
            { key: 'transfers', name: 'Transfers', color: '#3B82F6', type: 'area' } // Blue
          ]}
        />
        
        <InteractiveChart
          title="Volume & Activity"
          data={data}
          xAxisKey="date"
          loading={loading}
          dataKeys={[
            { key: 'volume', name: 'Volume (BZR)', color: '#8B5CF6', type: 'bar' }, // Purple
            { key: 'activeUsers', name: 'Active Users', color: '#10B981', type: 'area' } // Emerald
          ]}
        />
      </div>

      {/* Extra Insight (Optional) */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg text-blue-600 mt-0.5 flex-shrink-0">
           <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-blue-900">Insight</h4>
          <p className="text-xs sm:text-sm text-blue-700 mt-0.5 sm:mt-1">
            {timeRange === '7d' && 'Activity shows strong growth over the past week with an upward trend in daily transactions.'}
            {timeRange === '30d' && 'Steady transaction volume increase over the last 30 days, indicating healthy network usage.'}
            {timeRange === '90d' && 'Long-term analysis shows consistent growth pattern over the past 3 months with stable user engagement.'}
          </p>
        </div>
      </div>

    </div>
  );
}
