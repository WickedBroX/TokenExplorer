import React from 'react';
import {
  Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Bar, ComposedChart
} from 'recharts';

interface InteractiveChartProps {
  data: any[];
  title: string;
  dataKeys: Array<{ key: string; name: string; color: string; type?: 'area' | 'bar' | 'line' }>;
  xAxisKey: string;
  height?: number;
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 sm:p-3 border border-gray-200 shadow-lg rounded-lg text-xs sm:text-sm">
        <p className="font-bold text-gray-900 mb-1 sm:mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500 capitalize">{entry.name}:</span>
            <span className="font-mono font-medium text-gray-900">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  title,
  dataKeys,
  xAxisKey,
  height = 300,
  loading
}) => {
  if (loading) {
    return <div className={`w-full bg-gray-50 animate-pulse rounded-xl border border-gray-200`} style={{ height }} />;
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-sm sm:text-base font-bold text-gray-900">{title}</h3>
      </div>
      
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 10, right: 5, left: -30, bottom: 0 }}>
            <defs>
              {dataKeys.map((k, i) => (
                <linearGradient key={k.key} id={`color${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={k.color} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={k.color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis 
              dataKey={xAxisKey} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9CA3AF', fontSize: 10 }} 
              dy={10}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9CA3AF', fontSize: 10 }} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
            
            {dataKeys.map((k, i) => {
              if (k.type === 'bar') {
                return <Bar key={k.key} dataKey={k.key} name={k.name} fill={k.color} radius={[4, 4, 0, 0]} />;
              }
              // Default to Area
              return (
                <Area 
                  key={k.key}
                  type="monotone" 
                  dataKey={k.key} 
                  name={k.name}
                  stroke={k.color} 
                  fillOpacity={1} 
                  fill={`url(#color${i})`} 
                  strokeWidth={2}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
