"use client";

import useSWR from "swr";

/**
 * Agent identity response from the API
 */
export type AgentIdentityResponse = {
  identity: {
    agentId: string | null;
    agentAddress: string | null;
    agentURI: string | null;
    isRegistered: boolean;
  };
  registries: {
    identity: string;
    reputation: string;
    chainId: number;
    network: string;
  };
  config: {
    agentName: string;
    agentDomain: string;
  };
  endpoints: {
    free: string;
    premium: string;
    identity: string;
    agentCard: string;
  };
  error?: string;
  message?: string;
};

const fetcher = async (url: string): Promise<AgentIdentityResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch: ${res.status}`);
  }
  return res.json();
};

/**
 * Hook to fetch and cache agent identity using SWR
 *
 * Features:
 * - Automatic caching and revalidation
 * - Loading and error states
 * - Deduplication of requests
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { identity, isLoading, error } = useAgentIdentity();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!identity?.identity.isRegistered) return <div>Not registered</div>;
 *
 *   return <div>Agent ID: {identity.identity.agentId}</div>;
 * }
 * ```
 */
export function useAgentIdentity() {
  const { data, error, isLoading, mutate } = useSWR<AgentIdentityResponse>(
    "/api/agent/identity",
    fetcher,
    {
      // Revalidate on focus (when user returns to tab)
      revalidateOnFocus: false,
      // Don't revalidate on reconnect for identity (rarely changes)
      revalidateOnReconnect: false,
      // Cache for 5 minutes
      dedupingInterval: 5 * 60 * 1000,
    }
  );

  return {
    /** Full identity response */
    identity: data,
    /** Just the identity info (agentId, isRegistered, etc) */
    agentId: data?.identity.agentId ?? null,
    /** Whether the agent is registered on-chain */
    isRegistered: data?.identity.isRegistered ?? false,
    /** Chain info */
    chainId: data?.registries.chainId ?? null,
    network: data?.registries.network ?? null,
    /** Loading state */
    isLoading,
    /** Error if fetch failed */
    error: error as Error | undefined,
    /** Manually refresh identity */
    refresh: mutate,
  };
}
