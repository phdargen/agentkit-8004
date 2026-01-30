"use client";

import useSWR from "swr";

/**
 * Feedback entry from the reputation API
 */
export type FeedbackItem = {
  /** Unique feedback ID */
  id: string;
  /** Reviewer wallet address */
  reviewer: string;
  /** Feedback value (0-100) */
  value: number;
  /** Tags associated with the feedback */
  tags: string[];
  /** Optional feedback text */
  text?: string;
  /** Unix timestamp when feedback was created */
  createdAt: number;
  /** Optional endpoint that was rated */
  endpoint?: string;
  /** Whether the feedback has been revoked */
  isRevoked: boolean;
};

/**
 * Reputation summary statistics
 */
export type ReputationSummary = {
  /** Total number of feedback entries */
  count: number;
  /** Average feedback value (0-100) */
  averageValue: number;
};

/**
 * Agent reputation response from the API
 */
export type AgentReputationResponse = {
  summary: ReputationSummary;
  feedback: FeedbackItem[];
  agentId: string;
  error?: string;
  message?: string;
};

const fetcher = async (url: string): Promise<AgentReputationResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch: ${res.status}`);
  }
  return res.json();
};

/**
 * Hook to fetch and cache agent reputation using SWR
 *
 * Features:
 * - Automatic caching and revalidation
 * - Revalidates on focus for fresh reputation data
 * - Exports refresh function for manual updates after feedback submission
 *
 * @param agentId - Optional agent ID. If not provided, uses the server's agent
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { summary, feedback, isLoading, error, refresh } = useAgentReputation();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <p>Average Score: {summary.averageValue}</p>
 *       <p>Total Feedback: {summary.count}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgentReputation(agentId?: string | null) {
  const url = agentId 
    ? `/api/agent/reputation?agentId=${encodeURIComponent(agentId)}`
    : "/api/agent/reputation";

  const { data, error, isLoading, mutate } = useSWR<AgentReputationResponse>(
    url,
    fetcher,
    {
      // Revalidate on focus to get fresh reputation data
      revalidateOnFocus: true,
      // Revalidate on reconnect for reputation updates
      revalidateOnReconnect: true,
      // Cache for 1 minute (reputation changes more frequently than identity)
      dedupingInterval: 60 * 1000,
    }
  );

  return {
    /** Full response */
    data,
    /** Reputation summary (count and average value) */
    summary: data?.summary ?? { count: 0, averageValue: 0 },
    /** List of feedback entries */
    feedback: data?.feedback ?? [],
    /** Agent ID used for the query */
    agentId: data?.agentId ?? null,
    /** Loading state */
    isLoading,
    /** Error if fetch failed */
    error: error as Error | undefined,
    /** Manually refresh reputation data (call after submitting feedback) */
    refresh: mutate,
  };
}
