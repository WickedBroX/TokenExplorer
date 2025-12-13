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

export interface InternalTransfer {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  contractAddress?: string;
  input?: string;
  type?: string;
  isError?: string;
  errCode?: string;
  chainName: string;
  chainId: number;
}

export interface InternalTransfersResponse {
  data: InternalTransfer[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    totalIsApproximate?: boolean;
  };
  chain: { id: number; name: string };
  sort: 'asc' | 'desc';
  timestamp: number | null;
  stale?: boolean;
  source?: string;
  warnings?: Array<{ scope: string; code: string; message: string }>;
  availableChains: Array<{ id: number; name: string }>;
}

export interface AddressBalance {
  chainId: number;
  chainName: string;
  balanceRaw: string | null;
  balance: number | null;
  stale: boolean;
  source: string;
  error?: string;
}

export interface AddressActivitySummary {
  transferCount: number | null;
  chainCount: number | null;
  recentTransfers: Transfer[];
}

export interface AddressDetailsResponse {
  address: string;
  tokenAddress: string;
  balances: AddressBalance[];
  totalBalance: number;
  activity: AddressActivitySummary;
  timestamp: number | null;
  stale: boolean;
  source: string;
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

export interface MarketOverview {
  source: string;
  priceUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  volume24hUsd: number | null;
  volumeChange24hPercent: number | null;
  volMarketCapRatio: number | null;
  circulatingSupply: number | null;
  selfReportedCirculatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  low24hUsd?: number | null;
  high24hUsd?: number | null;
  priceChange24hPercent?: number | null;
  athUsd?: number | null;
  athDate?: string | null;
  athChangePercent?: number | null;
  atlUsd?: number | null;
  atlDate?: string | null;
  atlChangePercent?: number | null;
  stale?: boolean;
  warnings?: string[];
}

export interface FinalityResponse {
  blockNumber: number | null;
  blockNumberHex: string | null;
  timestamp: number;
  source: string;
}

export interface DexTrade {
  chainId: number;
  poolAddress: string;
  dexId?: string | null;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  timeStamp: number;
  traderAddress: string | null;
  side: 'buy' | 'sell' | null;
  amountBzrRaw: string | null;
  amountQuoteRaw: string | null;
  priceUsd: number | null;
  valueUsd: number | null;
  quoteSymbol: string | null;
  payload: unknown;
}

export interface DexTradesResponse {
  data: DexTrade[];
  chain: { id: number; name: string };
  pagination: {
    page: number;
    pageSize: number;
    resultCount: number;
    total: number;
    hasMore: boolean;
  };
  timestamp: number | null;
  stale?: boolean;
  source?: string;
  availableChains?: Array<{ id: number; name: string }>;
}

export interface CexMarket {
  exchangeId: string;
  symbol: string;
  baseSymbol: string | null;
  quoteSymbol: string | null;
  active: boolean;
  meta: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CexTrade {
  exchangeId: string;
  symbol: string;
  tradeId: string;
  timeStamp: number;
  side: 'buy' | 'sell' | null;
  price: number | null;
  amountBase: number | null;
  costQuote: number | null;
  feeQuote: number | null;
  payload: unknown;
}

export interface CexTradesResponse {
  enabled: boolean;
  data: CexTrade[];
  pagination: {
    page: number;
    pageSize: number;
    resultCount: number;
    total: number;
    hasMore: boolean;
  };
  timestamp: number | null;
  message?: string;
}

export interface CexMarketsResponse {
  data: CexMarket[];
  timestamp: number | null;
}

export interface CexDailyVolumeResponse {
  enabled: boolean;
  totals: {
    volumeQuote24h: number | null;
    trades24h: number | null;
  };
  series: Array<{
    day: string;
    exchangeId: string;
    symbol: string;
    volumeBase: number | null;
    volumeQuote: number | null;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    tradeCount: number | null;
  }>;
  timestamp: number | null;
  message?: string;
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
    total?: number;
    totalRaw?: number;
    hasMore?: boolean;
  };
  supply?: {
    totalSupply: number | null;
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
