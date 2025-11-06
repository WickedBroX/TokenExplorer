import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, Activity, Download, RefreshCw } from 'lucide-react';
import { EnhancedMetricCard } from './EnhancedMetricCard';
import { InteractiveChart } from './InteractiveChart';
import { ChainDistributionChart } from './ChainDistributionChart';
import { TopMoversTable } from './TopMoversTable';
import { exportToCSV, exportToJSON, formatAnalyticsForExport } from '../utils/exportUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://haswork.dev';

interface AnalyticsData {
  success: boolean;
  timeRange: string;
  chainId: string;
  dailyData: Array<{
    date: string;
    displayDate: string;
    count: number;
    volume: number;
    uniqueAddresses: number;
    avgTransferSize?: number;
    medianTransferSize?: number;
  }>;
  analyticsMetrics: {
    totalTransfers: number;
    totalVolume: number;
    avgTransferSize: number;
    activeAddresses: number;
    transfersChange?: number;
    volumeChange?: number;
    addressesChange?: number;
    dailyAvgTransfers?: number;
    dailyAvgVolume?: number;
    peakActivity?: {
      transfers: number;
      volume: number;
      date: string;
    };
    volatility?: number;
    medianDailyTransfers?: number;
  };
  predictions?: {
    transfers: number[];
    volume: number[];
  };
  anomalies?: {
    transferSpikes: Array<{ index: number; value: number; zScore: string }>;
    volumeSpikes: Array<{ index: number; value: number; zScore: string }>;
  };
  chainDistribution?: Array<{
    chain: string;
    count: number;
    volume: number;
    uniqueAddresses: number;
    percentage: string;
  }>;
  topAddresses?: Array<{
    address: string;
    totalTxs: number;
    sent: number;
    received: number;
    volume: number;
  }>;
  topWhales?: Array<{
    hash: string;
    from: string;
    to: string;
    value: number;
    timeStamp: number;
    chain: string;
  }>;
  performance?: {
    computeTimeMs: number;
    dataPoints: number;
    totalTransfersAnalyzed: number;
    cacheStatus: string;
    cacheAge?: number;
  };
  timestamp: number;
}

interface WorldClassAnalyticsTabProps {
  chainId?: string;
}

export function WorldClassAnalyticsTab({ chainId = 'all' }: WorldClassAnalyticsTabProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);

  // Fetch analytics data from backend
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/analytics?timeRange=${timeRange}&chainId=${chainId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AnalyticsData = await response.json();

      if (!data.success) {
        throw new Error('Failed to load analytics data');
      }

      setAnalyticsData(data);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [timeRange, chainId]);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 60 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAnalytics();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchAnalytics]);

  // Export handlers
  const handleExportCSV = () => {
    if (!analyticsData) return;
    const exportData = formatAnalyticsForExport(analyticsData);
    exportToCSV(exportData.dailyData, `analytics_${timeRange}_${chainId}`);
  };

  const handleExportJSON = () => {
    if (!analyticsData) return;
    const exportData = formatAnalyticsForExport(analyticsData);
    exportToJSON(exportData, `analytics_${timeRange}_${chainId}`);
  };

  // Prepare chart data with predictions
  const transferActivityData = analyticsData?.dailyData.map(d => ({
    displayDate: d.displayDate,
    transfers: d.count,
    date: d.date
  })) || [];

  const volumeData = analyticsData?.dailyData.map(d => ({
    displayDate: d.displayDate,
    volume: d.volume,
    avgTransferSize: d.avgTransferSize || 0,
    date: d.date
  })) || [];

  const addressActivityData = analyticsData?.dailyData.map(d => ({
    displayDate: d.displayDate,
    addresses: d.uniqueAddresses,
    date: d.date
  })) || [];

  // Prepare predictions if enabled
  const predictionData = showPredictions && analyticsData?.predictions ? 
    analyticsData.predictions.transfers.map((count, idx) => ({
      displayDate: `+${idx + 1}d`,
      transfers: count,
      isPrediction: true
    })) : [];

  const metrics = analyticsData?.analyticsMetrics;

  return (
    <div className="p-6 space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">
            Comprehensive insights
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Time range selector */}
            <div className="flex bg-gray-700/50 rounded-lg p-1">
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${timeRange === range
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                    }
                  `}
                >
                  {range === 'all' ? 'All Time' : range.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Manual refresh */}
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh analytics"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Auto refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
              ${autoRefresh 
                ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }
            `}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>

          {/* Predictions toggle */}
          <button
            onClick={() => setShowPredictions(!showPredictions)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${showPredictions 
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' 
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }
            `}
          >
            {showPredictions ? 'Hide' : 'Show'} Predictions
          </button>

          {/* Export dropdown */}
          <div className="relative group">
            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-all flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={handleExportCSV}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 rounded-t-lg transition-colors"
              >
                Export as CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 rounded-b-lg transition-colors"
              >
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance indicator */}
      {analyticsData?.performance && (
        <div className="flex items-center gap-4 text-xs text-gray-400 bg-gray-800/30 rounded-lg px-4 py-2">
          <span>Compute: {analyticsData.performance.computeTimeMs}ms</span>
          <span>•</span>
          <span>Data points: {analyticsData.performance.dataPoints}</span>
          <span>•</span>
          <span>Cache: {analyticsData.performance.cacheStatus}</span>
          {analyticsData.performance.cacheAge !== undefined && (
            <>
              <span>•</span>
              <span>Age: {analyticsData.performance.cacheAge}s</span>
            </>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
          <p className="font-semibold">Error loading analytics</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Enhanced Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedMetricCard
          title="Total Transfers"
          value={metrics?.totalTransfers || 0}
          change={metrics?.transfersChange}
          icon={<BarChart3 className="h-6 w-6" />}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          loading={loading}
          subtitle={`Avg ${metrics?.dailyAvgTransfers?.toLocaleString() || 0}/day`}
        />

        <EnhancedMetricCard
          title="Total Volume"
          value={`${(metrics?.totalVolume || 0).toLocaleString()} BZR`}
          change={metrics?.volumeChange}
          icon={<TrendingUp className="h-6 w-6" />}
          gradient="bg-gradient-to-br from-purple-500 to-purple-700"
          loading={loading}
          subtitle={`Avg ${metrics?.dailyAvgVolume?.toLocaleString() || 0}/day`}
        />

        <EnhancedMetricCard
          title="Avg Transfer Size"
          value={`${(metrics?.avgTransferSize || 0).toLocaleString()} BZR`}
          icon={<Activity className="h-6 w-6" />}
          gradient="bg-gradient-to-br from-green-500 to-green-700"
          loading={loading}
          subtitle={`Median ${metrics?.medianDailyTransfers?.toLocaleString() || 0}`}
        />

        <EnhancedMetricCard
          title="Active Addresses"
          value={metrics?.activeAddresses || 0}
          change={metrics?.addressesChange}
          icon={<Users className="h-6 w-6" />}
          gradient="bg-gradient-to-br from-orange-500 to-orange-700"
          loading={loading}
          subtitle="Unique participants"
        />
      </div>

      {/* Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InteractiveChart
          data={transferActivityData}
          title="Transfer Activity"
          description="Daily transfer count with trend analysis"
          type="area"
          dataKeys={[{ key: 'transfers', name: 'Transfers', color: '#3B82F6' }]}
          xAxisKey="displayDate"
          height={300}
          showBrush={true}
          showPredictions={showPredictions}
          predictions={predictionData}
          anomalies={analyticsData?.anomalies?.transferSpikes || []}
          loading={loading}
        />

        <InteractiveChart
          data={volumeData}
          title="Transfer Volume"
          description="Daily volume in BZR with average transfer size"
          type="combo"
          dataKeys={[
            { key: 'volume', name: 'Volume', color: '#8B5CF6', type: 'bar' },
            { key: 'avgTransferSize', name: 'Avg Size', color: '#10B981', type: 'line' }
          ]}
          xAxisKey="displayDate"
          height={300}
          anomalies={analyticsData?.anomalies?.volumeSpikes || []}
          loading={loading}
        />
      </div>

      {/* Address Activity Chart - Full Width */}
      <InteractiveChart
        data={addressActivityData}
        title="Address Activity"
        description="Unique addresses participating each day"
        type="area"
        dataKeys={[{ key: 'addresses', name: 'Unique Addresses', color: '#10B981' }]}
        xAxisKey="displayDate"
        height={250}
        showBrush={true}
        loading={loading}
      />

      {/* Advanced Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChainDistributionChart 
          data={analyticsData?.chainDistribution || []} 
          loading={loading}
        />

        <TopMoversTable 
          data={analyticsData?.topWhales || []} 
          loading={loading}
        />
      </div>

      {/* Peak Activity Insight */}
      {metrics?.peakActivity && !loading && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            Peak Activity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-400">Highest Transfers</p>
              <p className="text-2xl font-bold text-white mt-1">
                {metrics.peakActivity.transfers.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Highest Volume</p>
              <p className="text-2xl font-bold text-white mt-1">
                {metrics.peakActivity.volume.toLocaleString()} BZR
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Date</p>
              <p className="text-2xl font-bold text-white mt-1">
                {new Date(metrics.peakActivity.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
