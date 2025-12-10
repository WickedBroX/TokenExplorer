import React from 'react';
import { BarChart2 } from 'lucide-react';
import { WorldClassAnalyticsTab } from '../components/WorldClassAnalyticsTab';

export const AnalyticsPage: React.FC = () => {
  return (
    <div>
      <div id="analytics-title" className="flex items-center gap-3 mb-6 scroll-mt-24">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
          <BarChart2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      </div>

      <WorldClassAnalyticsTab />
    </div>
  );
};
