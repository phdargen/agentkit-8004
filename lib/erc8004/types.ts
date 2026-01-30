import type { Hex } from "viem";

/**
 * Identity record for an ERC-8004 agent
 */
export type IdentityRecord = {
  agentId: bigint;
  owner: Hex;
  agentURI: string;
};

/**
 * Feedback entry from the Reputation Registry
 */
export type FeedbackEntry = {
  agentId: bigint;
  clientAddress: Hex;
  feedbackIndex: bigint;
  score: number; // 0-100
  tag1: string;
  tag2: string;
  isRevoked: boolean;
};

/**
 * Input for giving feedback
 */
export type GiveFeedbackInput = {
  toAgentId: bigint;
  score: number; // 0-100
  tag1?: string;
  tag2?: string;
  endpoint?: string;
  feedbackURI?: string;
  feedbackHash?: Hex;
};

/**
 * Reputation summary for an agent
 */
export type ReputationSummary = {
  count: bigint;
  averageScore: number; // 0-100
};

/**
 * Registration result from the Identity Registry
 */
export type RegisterAgentResult = {
  transactionHash: Hex;
  agentAddress: Hex;
  agentId?: bigint;
};

/**
 * Agent identity state for bootstrap
 */
export type AgentIdentityState = {
  agentId: string | null;
  agentAddress: string;
  agentURI: string | null;
  isRegistered: boolean;
  chainId: number;
  identityRegistry: Hex;
  reputationRegistry: Hex;
};
