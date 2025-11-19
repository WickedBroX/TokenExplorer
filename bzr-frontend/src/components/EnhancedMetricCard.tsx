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
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="h-8 w-32 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
          {icon}
        </div>
        {typeof change !== 'undefined' && (
          <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
            isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{Math.abs(change).toFixed(2)}%</span>
          </div>
        )}
      </div>
      
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-2 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
