import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  RefreshCw,
} from "lucide-react";
import { EnhancedMetricCard } from "./EnhancedMetricCard";
import { InteractiveChart } from "./InteractiveChart";
import {
  useAnalytics,
  type AnalyticsTimeRange,
} from "../hooks/api/useAnalytics";

interface DataPoint {
  date: string;
  transfers: number;
  volume: number;
  activeUsers: number;
}

export function WorldClassAnalyticsTab() {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>("30d");

  const {
    data: analyticsData,
    isLoading: loading,
    refetch,
  } = useAnalytics(timeRange);

  // Map API data to component format
  const data: DataPoint[] =
    analyticsData?.dailyData.map((item) => ({
      date: item.displayDate,
      transfers: item.count,
      volume: item.volume,
      activeUsers: item.uniqueAddresses,
    })) || [];

  const metrics = analyticsData?.analyticsMetrics;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          Network Analytics
        </h2>

        <div className="flex items-center gap-1.5 sm:gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm w-full sm:w-auto">
          {(["7d", "30d", "90d", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                timeRange === range
                  ? "bg-gray-100 text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-200 mx-0.5 sm:mx-1" />
          <button
            onClick={() => refetch()}
            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
            title="Refresh Data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <EnhancedMetricCard
          title="Total Transfers"
          value={metrics?.totalTransfers.toLocaleString() || "..."}
          change={0} // TODO: Calculate change if API provides previous period data
          icon={<BarChart3 className="w-6 h-6" />}
          loading={loading}
          subtitle={
            timeRange === "all"
              ? "Lifetime transactions"
              : `In the last ${timeRange}`
          }
        />
        <EnhancedMetricCard
          title="Transfer Volume"
          value={`${
            metrics?.totalVolume.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            }) || "..."
          } BZR`}
          change={0}
          icon={<TrendingUp className="w-6 h-6" />}
          loading={loading}
          subtitle={`Last ${timeRange}`}
        />
        <EnhancedMetricCard
          title="Active Addresses"
          value={metrics?.activeAddresses.toLocaleString() || "..."}
          change={0}
          icon={<Users className="w-6 h-6" />}
          loading={loading}
          subtitle="Unique senders/receivers"
        />
        <EnhancedMetricCard
          title="Avg. Transaction"
          value={`${
            metrics?.avgTransferSize.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            }) || "..."
          } BZR`}
          change={0}
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
            {
              key: "transfers",
              name: "Transfers",
              color: "#3B82F6",
              type: "area",
            }, // Blue
          ]}
        />

        <InteractiveChart
          title="Volume & Activity"
          data={data}
          xAxisKey="date"
          loading={loading}
          dataKeys={[
            {
              key: "volume",
              name: "Volume (BZR)",
              color: "#8B5CF6",
              type: "bar",
            }, // Purple
            {
              key: "activeUsers",
              name: "Active Users",
              color: "#10B981",
              type: "area",
            }, // Emerald
          ]}
        />
      </div>

      {/* Extra Insight (Optional) */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg text-blue-600 mt-0.5 flex-shrink-0">
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-blue-900">
            Insight
          </h4>
          <p className="text-xs sm:text-sm text-blue-700 mt-0.5 sm:mt-1">
            {timeRange === "7d" &&
              "Activity shows strong growth over the past week with an upward trend in daily transactions."}
            {timeRange === "30d" &&
              "Steady transaction volume increase over the last 30 days, indicating healthy network usage."}
            {timeRange === "90d" &&
              "Long-term analysis shows consistent growth pattern over the past 3 months with stable user engagement."}
          </p>
        </div>
      </div>
    </div>
  );
}
