import { DEFAULT_APP_CONFIG } from './constants/index';

export const buildContractLinks = (tokenAddress?: string) => {
  const address = tokenAddress || DEFAULT_APP_CONFIG.tokenAddress;
  return [
    { name: 'Ethereum', url: `https://etherscan.io/address/${address}` },
    { name: 'Polygon', url: `https://polygonscan.com/address/${address}` },
    { name: 'BSC', url: `https://bscscan.com/address/${address}` },
    { name: 'Arbitrum', url: `https://arbiscan.io/address/${address}` },
    { name: 'Optimism', url: `https://optimistic.etherscan.io/address/${address}` },
    { name: 'Avalanche', url: `https://subnets.avax.network/c-chain/address/${address}` },
    { name: 'Base', url: `https://basescan.org/address/${address}` },
    { name: 'zkSync', url: `https://explorer.zksync.io/address/${address}` },
    { name: 'Mantle', url: `https://mantlescan.xyz/address/${address}` },
    { name: 'Cronos', url: `https://cronoscan.com/address/${address}` },
  ];
};
