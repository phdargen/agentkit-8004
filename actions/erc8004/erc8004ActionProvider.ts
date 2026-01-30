import { z } from "zod";
import { customActionProvider, EvmWalletProvider } from "@coinbase/agentkit";
import { encodeFunctionData, type Hex, decodeEventLog } from "viem";
import {
  RegisterAgentSchema,
  UpdateAgentURISchema,
  GetAgentIdentitySchema,
  AppendFeedbackResponseSchema,
  GetReputationSummarySchema,
} from "./schemas";
import { IDENTITY_REGISTRY_ABI, REPUTATION_REGISTRY_ABI } from "./abis";
import {
  getRegistryAddress,
  getChainIdFromNetwork,
  SUPPORTED_NETWORK_IDS,
} from "./constants";

/**
 * Get the chain ID from the wallet's network
 */
function getChainId(walletProvider: EvmWalletProvider): number {
  const network = walletProvider.getNetwork();
  const chainId = getChainIdFromNetwork(network);

  if (!chainId) {
    throw new Error(
      `Network ${network.networkId || network.chainId} is not supported for ERC-8004. ` +
        `Supported networks: ${SUPPORTED_NETWORK_IDS.join(", ")}`,
    );
  }

  return chainId;
}

/**
 * Register a new agent on the ERC-8004 Identity Registry.
 * Creates an on-chain identity for the agent by minting an NFT.
 */
export async function registerAgent(
  walletProvider: EvmWalletProvider,
  args: z.infer<typeof RegisterAgentSchema>,
): Promise<string> {
  try {
    const chainId = getChainId(walletProvider);
    const identityRegistry = getRegistryAddress("identity", chainId);

    const hash = await walletProvider.sendTransaction({
      to: identityRegistry,
      data: encodeFunctionData({
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "register",
        args: [args.agentURI],
      }),
    });

    const receipt = await walletProvider.waitForTransactionReceipt(hash);

    // Parse the Registered event to get the agentId
    let agentId: string | undefined;
    if (receipt?.logs) {
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: IDENTITY_REGISTRY_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "Registered" && decoded.args) {
            agentId = (decoded.args as { agentId: bigint }).agentId.toString();
            break;
          }
        } catch {
          // Skip logs that don't match our event
        }
      }
    }

    const agentAddress = walletProvider.getAddress();

    if (agentId) {
      return `Successfully registered agent. Agent ID: ${agentId}, Owner: ${agentAddress}, URI: ${args.agentURI}, Transaction: ${hash}`;
    }

    return `Agent registration transaction submitted. Transaction: ${hash}. Check the Identity Registry for your agent ID.`;
  } catch (error) {
    return `Error registering agent: ${error}`;
  }
}

/**
 * Update the metadata URI for an existing agent.
 */
async function updateAgentURI(
  walletProvider: EvmWalletProvider,
  args: z.infer<typeof UpdateAgentURISchema>,
): Promise<string> {
  try {
    const chainId = getChainId(walletProvider);
    const identityRegistry = getRegistryAddress("identity", chainId);

    const hash = await walletProvider.sendTransaction({
      to: identityRegistry,
      data: encodeFunctionData({
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "setAgentURI",
        args: [BigInt(args.agentId), args.newURI],
      }),
    });

    await walletProvider.waitForTransactionReceipt(hash);

    return `Successfully updated agent URI. Agent ID: ${args.agentId}, New URI: ${args.newURI}, Transaction: ${hash}`;
  } catch (error) {
    return `Error updating agent URI: ${error}`;
  }
}

/**
 * Get identity information for an agent.
 */
async function getAgentIdentity(
  walletProvider: EvmWalletProvider,
  args: z.infer<typeof GetAgentIdentitySchema>,
): Promise<string> {
  try {
    const chainId = getChainId(walletProvider);
    const identityRegistry = getRegistryAddress("identity", chainId);
    const agentId = BigInt(args.agentId);

    // Get owner
    const owner = await walletProvider.readContract({
      address: identityRegistry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "ownerOf",
      args: [agentId],
    });

    // Get URI
    const uri = await walletProvider.readContract({
      address: identityRegistry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "tokenURI",
      args: [agentId],
    });

    return `Agent Identity:\n- Agent ID: ${args.agentId}\n- Owner: ${owner}\n- URI: ${uri}\n- Registry: ${identityRegistry}`;
  } catch (error) {
    return `Error getting agent identity: ${error}. The agent ID may not exist.`;
  }
}

/**
 * Append a response to user feedback.
 */
async function appendFeedbackResponse(
  walletProvider: EvmWalletProvider,
  args: z.infer<typeof AppendFeedbackResponseSchema>,
): Promise<string> {
  try {
    const chainId = getChainId(walletProvider);
    const reputationRegistry = getRegistryAddress("reputation", chainId);

    const responseHash =
      args.responseHash ||
      "0x0000000000000000000000000000000000000000000000000000000000000000";

    const hash = await walletProvider.sendTransaction({
      to: reputationRegistry,
      data: encodeFunctionData({
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "appendResponse",
        args: [
          BigInt(args.agentId),
          args.clientAddress as Hex,
          BigInt(args.feedbackIndex),
          args.responseUri,
          responseHash as Hex,
        ],
      }),
    });

    await walletProvider.waitForTransactionReceipt(hash);

    return `Successfully appended response to feedback. Agent ID: ${args.agentId}, Client: ${args.clientAddress}, Feedback Index: ${args.feedbackIndex}, Transaction: ${hash}`;
  } catch (error) {
    return `Error appending feedback response: ${error}`;
  }
}

/**
 * Get the reputation summary for an agent.
 */
async function getReputationSummary(
  walletProvider: EvmWalletProvider,
  args: z.infer<typeof GetReputationSummarySchema>,
): Promise<string> {
  try {
    const chainId = getChainId(walletProvider);
    const reputationRegistry = getRegistryAddress("reputation", chainId);

    const [count, averageScore] = (await walletProvider.readContract({
      address: reputationRegistry,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getSummary",
      args: [BigInt(args.agentId), [], args.tag1 || "", args.tag2 || ""],
    })) as [bigint, number];

    const filters = [];
    if (args.tag1) filters.push(`tag1: ${args.tag1}`);
    if (args.tag2) filters.push(`tag2: ${args.tag2}`);
    const filterStr = filters.length > 0 ? ` (filtered by ${filters.join(", ")})` : "";

    return `Reputation Summary for Agent ${args.agentId}${filterStr}:\n- Feedback Count: ${count}\n- Average Score: ${averageScore}/100`;
  } catch (error) {
    return `Error getting reputation summary: ${error}`;
  }
}

/**
 * Factory function to create ERC-8004 action provider.
 * Returns a single action provider with all ERC-8004 identity and reputation actions.
 */
export const erc8004ActionProvider = () =>
  customActionProvider<EvmWalletProvider>([
    {
      name: "register_agent",
      description: `Register a new agent on the ERC-8004 Identity Registry.
This creates an on-chain identity for the agent by minting an NFT.

It takes the following input:
- agentURI: The URI pointing to the agent's metadata (e.g., ipfs://QmXxx... or https://example.com/metadata.json)

Returns the agent ID (token ID) and transaction hash.`,
      schema: RegisterAgentSchema,
      invoke: registerAgent,
    },
    {
      name: "update_agent_uri",
      description: `Update the metadata URI for an existing agent on the ERC-8004 Identity Registry.
Only the agent owner can update the URI.

It takes the following inputs:
- agentId: The agent's token ID on the Identity Registry
- newURI: The new URI for the agent's metadata

Returns the transaction hash.`,
      schema: UpdateAgentURISchema,
      invoke: updateAgentURI,
    },
    {
      name: "get_agent_identity",
      description: `Get identity information for an agent from the ERC-8004 Identity Registry.

It takes the following input:
- agentId: The agent's token ID to look up

Returns the agent's owner address and metadata URI.`,
      schema: GetAgentIdentitySchema,
      invoke: getAgentIdentity,
    },
    {
      name: "append_feedback_response",
      description: `Append a response to user feedback on the ERC-8004 Reputation Registry.
This allows agents to respond to feedback they have received.

It takes the following inputs:
- agentId: The agent's ID that received the feedback
- clientAddress: The address of the client who gave feedback
- feedbackIndex: The index of the feedback to respond to
- responseUri: URI pointing to the response content
- responseHash: Optional keccak256 hash of the response content

Returns the transaction hash.`,
      schema: AppendFeedbackResponseSchema,
      invoke: appendFeedbackResponse,
    },
    {
      name: "get_reputation_summary",
      description: `Get the reputation summary for an agent from the ERC-8004 Reputation Registry.

It takes the following inputs:
- agentId: The agent's ID to get reputation for
- tag1: Optional tag to filter feedback (e.g., 'quality', 'premium')
- tag2: Optional second tag to filter feedback

Returns the feedback count and average score (0-100).`,
      schema: GetReputationSummarySchema,
      invoke: getReputationSummary,
    },
  ]);
