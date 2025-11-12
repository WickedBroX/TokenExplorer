import { useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine
} from 'recharts';

interface ChartDataPoint {
  [key: string]: string | number | boolean | undefined;
}

interface InteractiveChartProps {
  data: ChartDataPoint[];
  title: string;
  description?: string;
  type: 'area' | 'bar' | 'line' | 'combo';
  dataKeys: Array<{
    key: string;
    name: string;
    color: string;
    type?: 'line' | 'bar' | 'area';
  }>;
  xAxisKey: string;
  height?: number;
  showBrush?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  showPredictions?: boolean;
  predictions?: ChartDataPoint[];
  anomalies?: Array<{ index: number; value: number }>;
  onDataPointClick?: (data: ChartDataPoint) => void;
  loading?: boolean;
}

export function InteractiveChart({
  data,
  title,
  description,
  type,
  dataKeys,
  xAxisKey,
  height = 300,
  showBrush = false,
  showGrid = true,
  showLegend = true,
  showPredictions = false,
  predictions = [],
  anomalies = [],
  loading = false
}: InteractiveChartProps) {
  const [scaleType, setScaleType] = useState<'linear' | 'log'>('linear');
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  // Combine actual data with predictions if enabled
  const baseChartData = showPredictions && predictions.length > 0
    ? [...data, ...predictions.map((pred, idx) => ({
        ...pred,
        isPrediction: true,
        [xAxisKey]: `Pred ${idx + 1}`
      }))]
    : data;

  // Transform data for log scale: replace zeros with small positive values
  const chartData = scaleType === 'log' 
    ? baseChartData.map(point => {
        const newPoint = { ...point };
        dataKeys.forEach(key => {
          const value = Number(newPoint[key.key]);
          if (!value || value <= 0) {
            // Replace zero/negative with a small value (0.1)
            newPoint[key.key] = 0.1;
          }
        });
        return newPoint;
      })
    : baseChartData;

  // Calculate domain for log scale to handle zero/small values
  const getYAxisDomain = (): [number, 'auto'] | [0, 'auto'] => {
    if (scaleType === 'linear') {
      return [0, 'auto'];
    }
    
    // For log scale, use 0.1 as minimum to handle transformed zeros
    return [0.1, 'auto'];
  };

  // Custom tooltip with enhanced information
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number | string; name: string; color: string; payload: ChartDataPoint }>; label?: string }) => {
    if (!active || !payload || payload.length === 0) return null;

    const isPredicted = payload[0]?.payload?.isPrediction;
    
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold mb-2">
          {label}
          {isPredicted && (
            <span className="ml-2 text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded">
              Predicted
            </span>
          )}
        </p>
        {payload.map((entry, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-300">{entry.name}:</span>
            <span className="text-white font-medium">
              {typeof entry.value === 'number' 
                ? entry.value.toLocaleString() 
                : entry.value}
            </span>
          </div>
        ))}
        
        {/* Show if this is an anomaly */}
        {anomalies.some(a => a.index === payload[0]?.payload?.index) && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Anomaly Detected
            </span>
          </div>
        )}
      </div>
    );
  };

  // Toggle legend item visibility
  const handleLegendClick = (dataKey: string) => {
    setHiddenKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey);
      } else {
        newSet.add(dataKey);
      }
      return newSet;
    });
  };

  // Render chart elements based on type and configuration
  const renderChartElements = () => {
    return dataKeys.map((config, index) => {
      if (hiddenKeys.has(config.key)) return null;

      const commonProps = {
        key: config.key,
        dataKey: config.key,
        name: config.name,
        stroke: config.color,
        fill: config.color
      };

      if (type === 'combo') {
        // For combo charts, respect individual element types
        if (config.type === 'bar' || (!config.type && index === 0)) {
          return <Bar {...commonProps} fillOpacity={0.8} radius={[8, 8, 0, 0]} />;
        } else if (config.type === 'area') {
          return (
            <Area
              {...commonProps}
              fillOpacity={0.2}
              strokeWidth={2}
              type="monotone"
            />
          );
        } else {
          return <Line {...commonProps} strokeWidth={2} type="monotone" dot={{ r: 4 }} />;
        }
      }

      // Single type charts
      switch (type) {
        case 'area':
          return (
            <Area
              {...commonProps}
              fillOpacity={0.2}
              strokeWidth={2}
              type="monotone"
            />
          );
        case 'bar':
          return <Bar {...commonProps} fillOpacity={0.8} radius={[8, 8, 0, 0]} />;
        case 'line':
          return <Line {...commonProps} strokeWidth={2} type="monotone" dot={{ r: 4 }} />;
        default:
          return null;
      }
    });
  };

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
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>No data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {description && (
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          )}
        </div>
        
        {/* Scale toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setScaleType('linear')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              scaleType === 'linear'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Linear
          </button>
          <button
            onClick={() => setScaleType('log')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              scaleType === 'log'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Log
          </button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />}
          
          <XAxis
            dataKey={xAxisKey}
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#9CA3AF' }}
          />
          
          <YAxis
            scale={scaleType}
            domain={getYAxisDomain()}
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#9CA3AF' }}
            tickFormatter={(value) => value.toLocaleString()}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && (
            <Legend
              onClick={(data) => {
                if (data.dataKey && typeof data.dataKey === 'string') {
                  handleLegendClick(data.dataKey);
                }
              }}
              wrapperStyle={{ cursor: 'pointer', paddingTop: '10px' }}
              iconType="circle"
            />
          )}

          {/* Render chart elements */}
          {renderChartElements()}

          {/* Prediction separator line */}
          {showPredictions && predictions.length > 0 && (
            <ReferenceLine
              x={String(data[data.length - 1]?.[xAxisKey] || '')}
              stroke="#6366F1"
              strokeDasharray="3 3"
              label={{ value: 'Predictions', position: 'top', fill: '#6366F1' }}
            />
          )}

          {/* Brush for time range selection */}
          {showBrush && (
            <Brush
              dataKey={xAxisKey}
              height={30}
              stroke="#6366F1"
              fill="#1F2937"
              travellerWidth={10}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Info footer */}
      {(showPredictions || anomalies.length > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap gap-4 text-xs text-gray-400">
          {showPredictions && predictions.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-blue-500" />
              <span>{predictions.length} day prediction</span>
            </div>
          )}
          {anomalies.length > 0 && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{anomalies.length} anomalies detected</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
