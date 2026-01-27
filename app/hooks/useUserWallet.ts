/**
 * Hook for user wallet interactions
 *
 * Provides utilities for interacting with the connected user wallet,
 * including balance checking and transaction signing.
 */

import { useAccount, useBalance, useChainId } from "wagmi";
import { baseSepolia } from "wagmi/chains";

export type UserWalletState = {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  chainId: number | undefined;
  chainName: string | undefined;
  balance: string | undefined;
  isBalanceLoading: boolean;
  isCorrectChain: boolean;
};

/**
 * Hook to access user wallet state and balance
 */
export function useUserWallet(): UserWalletState {
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();

  const { data: balanceData, isLoading: isBalanceLoading } = useBalance({
    address,
  });

  const isCorrectChain = chainId === baseSepolia.id;

  return {
    address,
    isConnected,
    chainId,
    chainName: chain?.name,
    balance: balanceData
      ? `${parseFloat(balanceData.formatted).toFixed(4)} ${balanceData.symbol}`
      : undefined,
    isBalanceLoading,
    isCorrectChain,
  };
}

/**
 * Format an address for display (truncated)
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get Base Sepolia explorer URL for a transaction
 */
export function getExplorerUrl(txHash: string): string {
  return `https://sepolia.basescan.org/tx/${txHash}`;
}

/**
 * Get Base Sepolia explorer URL for an address
 */
export function getAddressExplorerUrl(address: string): string {
  return `https://sepolia.basescan.org/address/${address}`;
}
