export interface TokenInfo {
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: number;
  totalSupply: string;
  circulatingSupply?: string | null;
  formattedTotalSupply: string;
  formattedCirculatingSupply?: string | null;
}

export interface Transfer {
  hash: string;
  blockNumber: string;
  blockHash?: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenDecimal: number;
  tokenName?: string;
  chainName: string;
  chainId: number;
  transactionIndex?: string;
  gas?: string;
  gasPrice?: string;
  gasUsed?: string;
  confirmations?: string;
  functionName?: string;
  methodId?: string;
  nonce?: string;
  contractAddress?: string;
  input?: string;
  cumulativeGasUsed?: string;
  logIndex?: string;
}

export interface ChainStat {
  chainName: string;
  chainId: number;
  holderCount: number;
  isLoading?: boolean;
  error?: string;
}

export interface TokenStats {
  totalHolders: number | string;
  chains: ChainStat[];
}

export interface ApiError {
  message: string;
}

export interface TransferWarmSummary {
  chainId: number;
  chainName: string;
  status: 'ok' | 'error';
  forceRefresh?: boolean;
  pageSize?: number;
  durationMs: number;
  timestamp: number;
  error?: string | null;
  errorCode?: string | null;
  warmed?: boolean;
  totalsWarmed?: boolean;
  upstream?: unknown;
  totals?: {
    available: boolean;
    total: number | null;
    totalTransfers?: number | null;
    totalTransfersAvailable?: boolean;
    source?: string | null;
    stale?: boolean;
    truncated?: boolean;
    windowCapped?: boolean;
    error?: string | null;
    errorCode?: string | null;
  };
}

export interface TransferPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  windowExceeded?: boolean;
  maxWindowPages?: number | null;
  resultWindow?: number | null;
}

export interface TransferTotalsMeta {
  total: number;
  allTimeTotal?: number | null; // True all-time total across all chains (independent of pagination)
  allTimeTotalAvailable?: boolean; // Whether all-time total is available
  truncated: boolean;
  resultLength: number;
  timestamp: number;
  stale: boolean;
  source: 'network' | 'cache' | 'stale-cache' | 'aggregated';
}

export interface TransferWarning {
  scope: string;
  code: string;
  message: string;
}

export interface TransferLimitsMeta {
  maxPageSize: number;
  totalFetchLimit: number;
  resultWindow: number | null;
}

export interface TransferDefaultsMeta {
  chainId: number;
  pageSize: number;
  sort: 'asc' | 'desc';
}

export interface TransferAvailableChain {
  id: number;
  name: string;
}

export interface TransferFiltersMeta {
  startBlock: number | null;
  endBlock: number | null;
}

export interface TransfersResponse<TTransfer> {
  data: TTransfer[];
  pagination?: TransferPaginationMeta; // legacy / single-chain
  meta?: TransferPaginationMeta;       // new backend shape
  totals: TransferTotalsMeta | null;
  chain: { id: number; name: string };
  sort: 'asc' | 'desc';
  filters: TransferFiltersMeta;
  timestamp: number | null;
  stale?: boolean;
  source: 'network' | 'cache' | 'stale-cache';
  warnings?: TransferWarning[];
  limits: TransferLimitsMeta;
  defaults: TransferDefaultsMeta;
  warm?: {
    chains: TransferWarmSummary[];
    timestamp: number | null;
  };
  availableChains: TransferAvailableChain[];
  request: {
    forceRefresh: boolean;
    includeTotals: boolean;
  };
  chains?: TransferWarmSummary[];
}

export interface TokenPriceResponse {
  available: boolean;
  priceUsd: number | null;
  priceUsdRaw: string | null;
  source: string;
  timestamp: number;
  proRequired: boolean;
  message?: string;
}

export interface FinalityResponse {
  blockNumber: number | null;
  blockNumberHex: string | null;
  timestamp: number;
  source: string;
}

export interface Holder {
  TokenHolderAddress: string;
  TokenHolderQuantity: string;
  chainId?: number;
  chainName?: string;
}

export interface HoldersResponse {
  data: Holder[];
  chain: {
    id: number;
    name: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    resultCount: number;
  };
  timestamp: number;
}

export interface AnalyticsDataPoint {
  date: string;
  displayDate: string;
  count: number;
  volume: number;
  uniqueAddresses: number;
}

export interface AnalyticsMetrics {
  totalTransfers: number;
  totalVolume: number;
  avgTransferSize: number;
  activeAddresses: number;
}

export interface AnalyticsPerformance {
  computeTimeMs: number;
  mode: 'persistent' | 'realtime';
}

export interface AnalyticsResponse {
  dailyData: AnalyticsDataPoint[];
  analyticsMetrics: AnalyticsMetrics;
  chainId: string;
  timeRange: string;
  performance: AnalyticsPerformance;
}
