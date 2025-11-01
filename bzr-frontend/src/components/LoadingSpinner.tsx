import * as React from 'react';

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <img 
        src="https://res.cloudinary.com/dhznjbcys/image/upload/v1762035630/spinner_wrtxnm.png" 
        alt="Loading..." 
        className="w-20 h-20 animate-spin"
      />
      <p className="mt-4 text-lg text-gray-600">Loading BZR Data...</p>
    </div>
  );
}