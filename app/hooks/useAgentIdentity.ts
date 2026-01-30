"use client";

import useSWR from "swr";

/**
 * ERC-8004 Service endpoint
 * @see https://eips.ethereum.org/EIPS/eip-8004#agent-uri-and-agent-registration-file
 */
export type AgentService = {
  /** Service name (e.g., "web", "A2A", "MCP", "OASF", "ENS", "DID", "email") */
  name: string;
  /** Service endpoint URL or identifier */
  endpoint: string;
  /** Optional version string */
  version?: string;
  /** Optional skills (for OASF) */
  skills?: string[];
  /** Optional domains (for OASF) */
  domains?: string[];
};

/**
 * ERC-8004 Agent Registration Metadata
 * @see https://eips.ethereum.org/EIPS/eip-8004#agent-uri-and-agent-registration-file
 */
export type AgentRegistrationMetadata = {
  /** Schema type identifier */
  type: string;
  /** Agent name for display */
  name: string;
  /** Natural language description of the agent */
  description: string;
  /** Agent image URL (IPFS or HTTPS) */
  image?: string;
  /** List of service endpoints (A2A, MCP, web, ENS, etc.) */
  services: AgentService[];
  /** Whether the agent supports x402 payments */
  x402Support: boolean;
  /** Whether the agent is currently active */
  active: boolean;
  /** On-chain registration references */
  registrations: Array<{
    agentId: number;
    agentRegistry: string;
  }>;
  /** Supported trust models (optional per spec) */
  supportedTrust?: Array<"reputation" | "crypto-economic" | "tee-attestation">;
};

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
  /** Metadata fetched from IPFS (ERC-8004 compliant structure) */
  metadata: AgentRegistrationMetadata | null;
  /** Full raw metadata as stored on IPFS */
  rawMetadata: Record<string, unknown> | null;
  /** 8004scan explorer URL */
  explorerUrl: string | null;
  registries: {
    identity: string;
    reputation: string;
    chainId: number;
    network: string;
  };
  endpoints: {
    free: string;
    premium: string;
    identity: string;
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
    /** Full response */
    data,
    /** Agent ID from on-chain */
    agentId: data?.identity.agentId ?? null,
    /** Whether the agent is registered on-chain */
    isRegistered: data?.identity.isRegistered ?? false,
    /** Agent URI (IPFS link) */
    agentURI: data?.identity.agentURI ?? null,
    /** Metadata from IPFS (ERC-8004 compliant) */
    metadata: data?.metadata ?? null,
    /** Full raw metadata as stored on IPFS */
    rawMetadata: data?.rawMetadata ?? null,
    /** 8004scan explorer URL */
    explorerUrl: data?.explorerUrl ?? null,
    /** Agent name from IPFS metadata */
    name: data?.metadata?.name ?? null,
    /** Agent description from IPFS metadata */
    description: data?.metadata?.description ?? null,
    /** Agent image from IPFS metadata */
    image: data?.metadata?.image ?? null,
    /** Service endpoints from metadata */
    services: data?.metadata?.services ?? [],
    /** Whether x402 payments are supported */
    x402Support: data?.metadata?.x402Support ?? false,
    /** Whether the agent is active */
    active: data?.metadata?.active ?? true,
    /** Supported trust models */
    supportedTrust: data?.metadata?.supportedTrust ?? [],
    /** Chain info */
    chainId: data?.registries.chainId ?? null,
    network: data?.registries.network ?? null,
    /** Loading state */
    isLoading,
    /** Error if fetch failed */
    error: error as Error | undefined,
    /** Manually refresh identity and metadata */
    refresh: mutate,
  };
}
