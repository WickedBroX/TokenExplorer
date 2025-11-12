import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EnhancedMetricCardProps {
  title: string;
  value: string | number;
  change?: number; // Percentage change from previous period
  trend?: 'up' | 'down' | 'neutral';
  sparklineData?: number[]; // Mini chart data points
  icon?: React.ReactNode;
  gradient: string; // Tailwind gradient classes
  onClick?: () => void;
  subtitle?: string;
  loading?: boolean;
}

export function EnhancedMetricCard({
  title,
  value,
  change,
  trend,
  sparklineData = [],
  icon,
  gradient,
  onClick,
  subtitle,
  loading = false
}: EnhancedMetricCardProps) {
  // Determine trend automatically if not provided
  const determinedTrend = trend || (change && change > 0 ? 'up' : change && change < 0 ? 'down' : 'neutral');
  
  // Trend color classes
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400'
  };

  // Trend icons
  const TrendIcon = determinedTrend === 'up' ? TrendingUp : 
                    determinedTrend === 'down' ? TrendingDown : 
                    Minus;

  // Simple sparkline renderer
  const renderSparkline = () => {
    if (sparklineData.length === 0) return null;

    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;

    const points = sparklineData.map((value, index) => {
      const x = (index / (sparklineData.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-full h-12 mt-2 opacity-50" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  return (
    <div
      className={`
        ${gradient} 
        rounded-lg p-6 text-white shadow-lg 
        transition-all duration-300 hover:shadow-xl hover:scale-[1.02]
        ${onClick ? 'cursor-pointer' : ''}
        ${loading ? 'animate-pulse' : ''}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-90">{title}</p>
          {subtitle && (
            <p className="text-xs opacity-70 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="ml-2 opacity-80">
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-10 bg-white/20 rounded animate-pulse mt-2" />
      ) : (
        <div className="text-3xl font-bold mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      )}

      {/* Change indicator */}
      {change !== undefined && change !== null && !isNaN(change) && !loading && (
        <div className="flex items-center gap-1 mt-2">
          <TrendIcon className={`h-4 w-4 ${trendColors[determinedTrend]}`} />
          <span className={`text-sm font-medium ${trendColors[determinedTrend]}`}>
            {change > 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
          <span className="text-xs opacity-70 ml-1">vs previous period</span>
        </div>
      )}

      {/* Sparkline */}
      {sparklineData.length > 0 && !loading && (
        <div className="mt-2 opacity-60">
          {renderSparkline()}
        </div>
      )}

      {/* Click hint */}
      {onClick && !loading && (
        <div className="text-xs opacity-60 mt-2 flex items-center gap-1">
          <span>Click for details</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
