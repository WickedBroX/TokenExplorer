export interface TokenInfo {
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: number;
  formattedTotalSupply: string;
}

export interface Transfer {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenDecimal: number;
  chainName: string;
  chainId: number;
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

export type TransferChainStatus = {
  chainId: number;
  chainName: string;
  status: 'ok' | 'error';
  transferCount: number;
  error?: string;
};

export interface TransfersResponse<TTransfer> {
  data: TTransfer[];
  chains: TransferChainStatus[];
  timestamp: number | null;
  stale?: boolean;
}
