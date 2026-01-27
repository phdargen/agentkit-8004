"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider as WagmiConfigProvider } from "wagmi";
import { useState, type ReactNode } from "react";
import { wagmiConfig } from "../lib/wagmi-config";

type WagmiProviderProps = {
  children: ReactNode;
};

/**
 * Wagmi Provider wrapper for the application
 * Provides wallet connectivity context to all child components
 */
export function WagmiProvider({ children }: WagmiProviderProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiConfigProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiConfigProvider>
  );
}
