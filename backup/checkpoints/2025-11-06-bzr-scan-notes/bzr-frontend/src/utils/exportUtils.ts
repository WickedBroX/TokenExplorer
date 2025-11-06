// Export utilities for analytics data

/**
 * Export data as CSV file
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data as JSON file
 */
export function exportToJSON(data: unknown, filename: string) {
  if (!data) {
    alert('No data to export');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${Date.now()}.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export chart as PNG image
 */
export function exportChartToPNG(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('Chart element not found');
    return;
  }

  // Find the SVG element within the chart
  const svgElement = element.querySelector('svg');
  if (!svgElement) {
    alert('Chart SVG not found');
    return;
  }

  // Get SVG data
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  // Create canvas and draw SVG
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = svgElement.clientWidth * 2; // 2x for better quality
    canvas.height = svgElement.clientHeight * 2;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      alert('Failed to create canvas context');
      return;
    }

    // Fill background
    ctx.fillStyle = '#1F2937'; // Match chart background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Convert to PNG and download
    canvas.toBlob((blob) => {
      if (!blob) {
        alert('Failed to create image');
        return;
      }
      
      const link = document.createElement('a');
      const pngUrl = URL.createObjectURL(blob);
      
      link.setAttribute('href', pngUrl);
      link.setAttribute('download', `${filename}_${Date.now()}.png`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
    
    URL.revokeObjectURL(url);
  };
  
  img.src = url;
}

/**
 * Copy data to clipboard
 */
export async function copyToClipboard(data: string) {
  try {
    await navigator.clipboard.writeText(data);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

/**
 * Format analytics data for export
 */
export function formatAnalyticsForExport(analyticsData: {
  dailyData?: Array<{
    date: string;
    displayDate: string;
    count: number;
    volume: number;
    uniqueAddresses: number;
    avgTransferSize?: number;
    medianTransferSize?: number;
  }>;
  analyticsMetrics?: {
    totalTransfers: number;
    totalVolume: number;
    avgTransferSize: number;
    activeAddresses: number;
    transfersChange?: number;
    volumeChange?: number;
    addressesChange?: number;
  };
  chainDistribution?: Array<{
    chain: string;
    count: number;
    volume: number;
    percentage: string;
  }>;
  topWhales?: Array<{
    hash: string;
    from: string;
    to: string;
    value: number;
    timeStamp: number;
    chain: string;
  }>;
}) {
  return {
    summary: {
      exportDate: new Date().toISOString(),
      ...(analyticsData.analyticsMetrics || {})
    },
    dailyData: analyticsData.dailyData || [],
    chainDistribution: analyticsData.chainDistribution || [],
    topWhaleTransfers: analyticsData.topWhales || []
  };
}
