/**
 * Search Utilities for BZR Token Explorer
 * Provides validation, type detection, and search helpers
 */

export type SearchType = 'address' | 'transaction' | 'block' | 'ens' | 'unknown';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  type?: SearchType;
}

export interface SearchResult {
  success: boolean;
  searchType: SearchType;
  query: string;
  source: string;
  type: string;
  found: boolean;
  data?: {
    address?: string;
    hash?: string;
    blockNumber?: number | string;
    timestamp?: number | string;
    from?: string;
    to?: string;
    value?: string;
    gasUsed?: string;
    chainId?: number;
    chainName?: string;
    transferCount?: number;
    chainCount?: number;
    message?: string;
    [key: string]: unknown;
  };
  error?: string;
}

/**
 * Detect the type of search query
 */
export const detectSearchType = (query: string): SearchType => {
  if (!query || typeof query !== 'string') {
    return 'unknown';
  }

  const trimmed = query.trim().toLowerCase();

  // Ethereum address: 0x followed by 40 hex characters
  if (/^0x[a-f0-9]{40}$/i.test(trimmed)) {
    return 'address';
  }

  // Transaction hash: 0x followed by 64 hex characters
  if (/^0x[a-f0-9]{64}$/i.test(trimmed)) {
    return 'transaction';
  }

  // Block number: pure digits
  if (/^\d+$/.test(trimmed)) {
    return 'block';
  }

  // ENS domain: ends with .eth
  if (trimmed.endsWith('.eth')) {
    return 'ens';
  }

  return 'unknown';
};

/**
 * Validate Ethereum address
 */
export const validateAddress = (address: string): ValidationResult => {
  if (!address || !address.trim()) {
    return { 
      valid: false, 
      error: 'Please enter an address' 
    };
  }

  const trimmed = address.trim();

  // Check if it starts with 0x
  if (!trimmed.startsWith('0x')) {
    return {
      valid: false,
      error: 'Address must start with "0x"'
    };
  }

  // Check if it's the right length (0x + 40 hex characters)
  if (trimmed.length !== 42) {
    return {
      valid: false,
      error: `Invalid address length. Expected 42 characters (0x + 40 hex), got ${trimmed.length}`
    };
  }

  // Check if it contains only valid hex characters
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Address contains invalid characters. Only hexadecimal characters (0-9, a-f) are allowed'
    };
  }

  // Basic validation passed
  return { 
    valid: true,
    type: 'address'
  };
};

/**
 * Validate transaction hash
 */
export const validateTransactionHash = (hash: string): ValidationResult => {
  if (!hash || !hash.trim()) {
    return {
      valid: false,
      error: 'Please enter a transaction hash'
    };
  }

  const trimmed = hash.trim();

  if (!trimmed.startsWith('0x')) {
    return {
      valid: false,
      error: 'Transaction hash must start with "0x"'
    };
  }

  if (trimmed.length !== 66) {
    return {
      valid: false,
      error: `Invalid transaction hash length. Expected 66 characters (0x + 64 hex), got ${trimmed.length}`
    };
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Transaction hash contains invalid characters'
    };
  }

  return {
    valid: true,
    type: 'transaction'
  };
};

/**
 * Validate block number
 */
export const validateBlockNumber = (block: string): ValidationResult => {
  if (!block || !block.trim()) {
    return {
      valid: false,
      error: 'Please enter a block number'
    };
  }

  const trimmed = block.trim();

  if (!/^\d+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Block number must contain only digits'
    };
  }

  const blockNum = parseInt(trimmed);

  if (!Number.isFinite(blockNum) || blockNum < 0) {
    return {
      valid: false,
      error: 'Invalid block number'
    };
  }

  if (blockNum > 999999999) {
    return {
      valid: false,
      warning: 'Block number seems unusually high. Are you sure?'
    };
  }

  return {
    valid: true,
    type: 'block'
  };
};

/**
 * Validate any search query and determine its type
 */
export const validateSearchQuery = (query: string): ValidationResult => {
  if (!query || !query.trim()) {
    return {
      valid: false,
      error: 'Please enter a search query'
    };
  }

  const type = detectSearchType(query);

  switch (type) {
    case 'address':
      return validateAddress(query);
    
    case 'transaction':
      return validateTransactionHash(query);
    
    case 'block':
      return validateBlockNumber(query);
    
    case 'ens':
      // ENS validation (basic)
      if (query.trim().length < 7) { // minimum: x.eth
        return {
          valid: false,
          error: 'ENS domain too short'
        };
      }
      return {
        valid: true,
        type: 'ens',
        warning: 'ENS resolution is not yet implemented'
      };
    
    default:
      return {
        valid: false,
        error: 'Invalid search query. Please enter an Ethereum address, transaction hash, or block number',
        type: 'unknown'
      };
  }
};

/**
 * Truncate address or hash for display
 */
export const truncateHash = (hash: string, startChars: number = 6, endChars: number = 4): string => {
  if (!hash || hash.length <= startChars + endChars) {
    return hash;
  }
  return `${hash.substring(0, startChars)}...${hash.substring(hash.length - endChars)}`;
};

/**
 * Format search result message for user
 */
export const formatSearchResultMessage = (result: SearchResult): string => {
  if (!result.found) {
    switch (result.searchType) {
      case 'address':
        return 'No transfers found for this address';
      case 'transaction':
        return 'Transaction not found on any supported chain';
      case 'block':
        return 'No transfers found in this block';
      default:
        return result.error || 'Not found';
    }
  }

  if (result.data?.message) {
    return result.data.message;
  }

  switch (result.searchType) {
    case 'address':
      return `Found ${result.data?.transferCount || 0} transfers`;
    case 'transaction':
      return `Transaction found on ${result.data?.chainName || 'blockchain'}`;
    case 'block':
      return `Found ${result.data?.transferCount || 0} transfers in block`;
    default:
      return 'Search completed';
  }
};

/**
 * Get search type icon/emoji
 */
export const getSearchTypeIcon = (type: SearchType): string => {
  switch (type) {
    case 'address':
      return '👤';
    case 'transaction':
      return '📝';
    case 'block':
      return '📦';
    case 'ens':
      return '🏷️';
    default:
      return '🔍';
  }
};

/**
 * Get search type label
 */
export const getSearchTypeLabel = (type: SearchType): string => {
  switch (type) {
    case 'address':
      return 'Address';
    case 'transaction':
      return 'Transaction';
    case 'block':
      return 'Block';
    case 'ens':
      return 'ENS Domain';
    default:
      return 'Unknown';
  }
};

/**
 * Recent searches storage (localStorage)
 */
const RECENT_SEARCHES_KEY = 'bzr_recent_searches';
const MAX_RECENT_SEARCHES = 10;

export interface RecentSearch {
  query: string;
  type: SearchType;
  timestamp: number;
  found?: boolean;
}

export const getRecentSearches = (): RecentSearch[] => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];
    const searches = JSON.parse(stored);
    return Array.isArray(searches) ? searches : [];
  } catch (error) {
    console.error('Failed to load recent searches:', error);
    return [];
  }
};

export const saveRecentSearch = (search: RecentSearch): void => {
  try {
    const recent = getRecentSearches();
    
    // Remove duplicates
    const filtered = recent.filter(s => s.query.toLowerCase() !== search.query.toLowerCase());
    
    // Add new search at the beginning
    const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent search:', error);
  }
};

export const clearRecentSearches = (): void => {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.error('Failed to clear recent searches:', error);
  }
};

/**
 * Format time ago for recent searches
 */
export const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
};
