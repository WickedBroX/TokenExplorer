import * as React from 'react';
import type { ReactElement } from 'react';

// --- Helper Components ---
export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <img 
        src="https://res.cloudinary.com/dhznjbcys/image/upload/v1762104033/loading_2_z6inrd.png" 
        alt="Loading..." 
        className="w-4 h-4 animate-spin"
      />
      <p className="mt-4 text-lg text-gray-600">Loading BZR Data...</p>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
      <strong className="font-bold mr-2">Error!</strong>
      <span className="block sm:inline">{message}</span>
    </div>
  );
}

interface TabButtonProps {
  title: string;
  icon: ReactElement<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
}

export function TabButton({ title, icon, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        ${isActive
          ? 'border-blue-500 text-blue-600 bg-blue-50'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'}
        group inline-flex items-center py-4 px-4 border-b-2 font-medium text-sm transition-all rounded-t-lg
      `}
    >
      {React.cloneElement(icon, {
        className: `w-5 h-5 mr-2 ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`,
      })}
      <span>{title}</span>
    </button>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactElement<{ className?: string }>;
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-white shadow-lg rounded-lg p-5 flex items-center space-x-4 border border-gray-100 hover:border-blue-200 transition-colors">
      <div className="p-3 rounded-full bg-blue-50">
        {React.cloneElement(icon, {
          className: 'w-6 h-6 text-blue-500',
        })}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

interface ChainHolderStatProps {
  chainName: string;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function ChainHolderStat({ 
  chainName, 
  isLoading, 
  error, 
  onRetry 
}: ChainHolderStatProps) {
  return (
    <div className="bg-white border border-gray-200 p-4 rounded-lg text-center transform hover:scale-105 transition-all duration-200 group relative overflow-hidden shadow-sm hover:shadow-md">
      {/* Animated gradient border */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-200 via-purple-200 to-blue-200 opacity-0 group-hover:opacity-100 transition-opacity" style={{ padding: '1px' }}>
        <div className="bg-white h-full w-full"></div>
      </div>
      
      <div className="relative">
        <p className="text-sm font-medium text-gray-600 group-hover:text-gray-800 transition-colors mb-2">{chainName}</p>
        <div>
          {isLoading ? (
            <div className="flex justify-center items-center h-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-b-transparent"></div>
            </div>
          ) : error ? (
            <div className="text-gray-500 text-sm">
              Pro Feature
              <button
                className="block mx-auto mt-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                onClick={onRetry}
              >
                Upgrade
              </button>
            </div>
          ) : (
            <p className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              Pro Feature
            </p>
          )}
        </div>
      </div>
    </div>
  );
}