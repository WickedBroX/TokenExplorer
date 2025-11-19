import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface EnhancedMetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  subtitle?: string;
  loading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}

export const EnhancedMetricCard: React.FC<EnhancedMetricCardProps> = ({
  title,
  value,
  change,
  icon,
  subtitle,
  loading,
}) => {
  const isPositive = (change || 0) >= 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
        <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-100 rounded animate-pulse mb-3 sm:mb-4" />
        <div className="h-6 sm:h-8 w-24 sm:w-32 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-3 sm:h-4 w-12 sm:w-16 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <div className="p-2 sm:p-2.5 bg-blue-50 text-blue-600 rounded-lg">
          {icon}
        </div>
        {typeof change !== 'undefined' && (
          <div className={`flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
            isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <TrendIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{Math.abs(change).toFixed(2)}%</span>
          </div>
        )}
      </div>
      
      <div>
        <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1.5 sm:mt-2 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
