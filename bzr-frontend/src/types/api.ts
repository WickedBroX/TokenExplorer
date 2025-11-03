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
