"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { CHAIN_NAME } from "../lib/wagmi-config";

/**
 * Wallet connection component
 * Allows users to connect their wallet for interacting with the agent
 */
export function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex-grow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Connected to {chain?.name || CHAIN_NAME}</p>
          <p className="font-mono text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Connect wallet to interact with the agent</p>
      {connectors.map(connector => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-[#0052FF] hover:bg-[#003ECF] rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Connecting..." : `Connect ${connector.name}`}
        </button>
      ))}
    </div>
  );
}
