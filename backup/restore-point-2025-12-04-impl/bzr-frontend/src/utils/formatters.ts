

export const truncateHash = (hash: string, start = 6, end = 4) => {
  if (!hash) return '';
  return `${hash.substring(0, start)}...${hash.substring(hash.length - end)}`;
};

export const formatValue = (value: string, decimals: number): string => {
  try {
    const numValue = BigInt(value);
    const decimalUnits = Number.isFinite(decimals) ? Math.max(Math.floor(decimals), 0) : 0;
    const divisor = BigInt(10) ** BigInt(decimalUnits);

    if (divisor === BigInt(0)) {
      return '0';
    }

    const integerPart = numValue / divisor;
    const remainder = numValue % divisor;

    if (remainder === BigInt(0)) {
      return integerPart.toString();
    }

    const remainderString = remainder.toString().padStart(decimalUnits, '0');
    const fractionalPrecision = remainderString.slice(0, Math.max(4, 1)).replace(/0+$/, '');

    return `${integerPart.toString()}.${fractionalPrecision || '0'}`;
  } catch (e) {
    console.error('Error formatting value:', e);
    return '0';
  }
};

export const timeAgo = (timestamp: string): string => {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) {
    return 'Unknown time';
  }

  const now = Date.now();
  const seconds = Math.floor(now / 1000) - parsed;

  const safeSeconds = Math.max(seconds, 0);

  let interval = safeSeconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = safeSeconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = safeSeconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = safeSeconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = safeSeconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(safeSeconds) + " seconds ago";
};

export const getExplorerUrl = (chainName: string, hash: string, type: 'tx' | 'address' = 'tx'): string => {
  const explorerMap: Record<string, string> = {
    'Ethereum': `https://etherscan.io/${type}/${hash}`,
    'Polygon': `https://polygonscan.com/${type}/${hash}`,
    'BSC': `https://bscscan.com/${type}/${hash}`,
    'Arbitrum': `https://arbiscan.io/${type}/${hash}`,
    'Optimism': `https://optimistic.etherscan.io/${type}/${hash}`,
    'Avalanche': `https://subnets.avax.network/c-chain/${type}/${hash}`,
    'Base': `https://basescan.org/${type}/${hash}`,
    'zkSync': `https://explorer.zksync.io/${type}/${hash}`,
    'Mantle': `https://mantlescan.xyz/${type}/${hash}`,
    'Cronos': `https://cronoscan.com/${type}/${hash}`,
  };
  
  return explorerMap[chainName] || `https://etherscan.io/${type}/${hash}`;
};

export const formatUsdValue = (usdValue: number): string => {
  if (usdValue >= 1000000) {
    return `$${(usdValue / 1000000).toFixed(2)}M`;
  } else if (usdValue >= 1000) {
    return `$${(usdValue / 1000).toFixed(2)}K`;
  } else if (usdValue >= 0.01) {
    return `$${usdValue.toFixed(2)}`;
  } else {
    return `$${usdValue.toFixed(4)}`;
  }
};
