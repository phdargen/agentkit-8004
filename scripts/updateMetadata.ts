#!/usr/bin/env npx tsx
/**
 * ERC-8004 Agent Metadata Update Script
 *
 * This script updates the metadata URI for an existing agent.
 * Use this to update agent information after initial registration.
 *
 * Usage:
 *   pnpm updateMetadata
 *
 * Requirements:
 *   - CDP_API_KEY_ID and CDP_API_KEY_SECRET in .env
 *   - CDP_WALLET_SECRET in .env
 *   - AGENT_WALLET_ADDRESS in .env
 *   - AGENT_ID in .env (the agent ID to update)
 *   - NETWORK_ID in .env (e.g., "base-sepolia")
 *   - PINATA_JWT in .env (for IPFS uploads)
 *   - AGENT_NAME, AGENT_DESCRIPTION, AGENT_IMAGE (optional)
 */

import "dotenv/config";
import { createPublicClient, http, encodeFunctionData, type Hex, type Chain } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { CdpEvmWalletProvider } from "@coinbase/agentkit";

// Reuse existing constants and ABIs
import {
  getRegistryAddress,
  getChainIdFromNetworkId,
  DEFAULT_NETWORK_ID,
} from "../actions/erc8004/constants.js";
import { IDENTITY_REGISTRY_ABI } from "../lib/erc8004/abi.js";

// Chain configs for explorer URLs
const EXPLORER_URLS: Record<number, string> = {
  84532: "https://sepolia.basescan.org",
  11155111: "https://sepolia.etherscan.io",
};

const CHAINS: Record<number, Chain> = {
  84532: baseSepolia,
  11155111: sepolia,
};

// ============================================================================
// Metadata Generation Utilities
// ============================================================================

/**
 * ERC-8004 Service endpoint (from spec)
 * @see https://eips.ethereum.org/EIPS/eip-8004#agent-uri-and-agent-registration-file
 */
interface AgentService {
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
}

/**
 * ERC-8004 Agent Registration structure
 * @see https://eips.ethereum.org/EIPS/eip-8004#agent-uri-and-agent-registration-file
 */
interface AgentRegistration {
  /** Schema type identifier - MUST be this exact value */
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";
  /** Agent name for display */
  name: string;
  /** Natural language description of the agent */
  description: string;
  /** Agent image URL (IPFS or HTTPS) */
  image: string;
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
}

/**
 * Formats a CAIP-10 address identifier
 */
function formatCAIP10Address(chainId: number, address: string): string {
  return `eip155:${chainId}:${address}`;
}

/**
 * Options for generating an agent registration
 */
interface GenerateRegistrationOptions {
  agentId: number;
  chainId: number;
  registryAddress: Hex;
  name?: string;
  description?: string;
  image?: string;
  /** Base URL for the agent (e.g., "https://myagent.example.com") */
  baseUrl?: string;
  /** Whether x402 payments are supported */
  x402Support?: boolean;
  /** Additional custom services */
  additionalServices?: AgentService[];
}

/**
 * Generates an ERC-8004 compliant agent registration JSON structure
 * @see https://eips.ethereum.org/EIPS/eip-8004#agent-uri-and-agent-registration-file
 */
function generateAgentRegistration(options: GenerateRegistrationOptions): AgentRegistration {
  const {
    agentId,
    chainId,
    registryAddress,
    name,
    description,
    image,
    baseUrl,
    x402Support = false,
    additionalServices = [],
  } = options;

  // Build services array based on base URL
  const services: AgentService[] = [];

  if (baseUrl) {
    // Normalize: remove trailing slash
    const normalizedUrl = baseUrl.replace(/\/$/, "");

    // Web service - the main agent interface
    services.push({
      name: "web",
      endpoint: normalizedUrl,
    });

    // API endpoints - derived from base URL
    // Free endpoint: /api/agent
    // Premium endpoint: /api/agent/premium (only if x402 is supported)
    services.push({
      name: "api",
      endpoint: `${normalizedUrl}/api/agent`,
    });

    if (x402Support) {
      services.push({
        name: "api-premium",
        endpoint: `${normalizedUrl}/api/agent/premium`,
      });
    }
  }

  // Add any additional custom services
  services.push(...additionalServices);

  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: name || `Agent ${agentId}`,
    description: description || "",
    image: image || "",
    services,
    x402Support,
    active: true,
    registrations: [
      {
        agentId,
        agentRegistry: formatCAIP10Address(chainId, registryAddress),
      },
    ],
    supportedTrust: ["reputation"],
  };
}

/**
 * Uploads JSON data to IPFS using Pinata
 */
async function uploadJsonToIPFS(pinataJwt: string, json: object, name: string): Promise<string> {
  const requestBody = {
    pinataOptions: {
      cidVersion: 1,
    },
    pinataMetadata: {
      name: `${name}.json`,
    },
    pinataContent: json,
  };

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to upload JSON to IPFS: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return data.IpfsHash;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("\n📝 ERC-8004 Agent Metadata Update\n");

  // Validate environment
  const requiredEnvVars = [
    "CDP_API_KEY_ID",
    "CDP_API_KEY_SECRET",
    "CDP_WALLET_SECRET",
    "AGENT_WALLET_ADDRESS",
    "AGENT_ID",
    "PINATA_JWT",
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  const networkId = process.env.NETWORK_ID || DEFAULT_NETWORK_ID;
  const agentWalletAddress = process.env.AGENT_WALLET_ADDRESS as Hex;
  const agentIdStr = process.env.AGENT_ID!;
  const agentId = parseInt(agentIdStr, 10);
  const pinataJwt = process.env.PINATA_JWT!;
  const agentName = process.env.AGENT_NAME;
  const agentDescription = process.env.AGENT_DESCRIPTION;
  const agentImage = process.env.AGENT_IMAGE;

  // Base URL for service endpoints (optional, but recommended)
  const baseUrl = process.env.AGENT_BASE_URL;
  // x402 support is determined by whether X402_PRICE is set
  const x402Support = !!process.env.X402_PRICE;

  if (isNaN(agentId)) {
    console.error(`❌ Invalid AGENT_ID: ${agentIdStr}`);
    process.exit(1);
  }

  // Get chain config from existing constants
  const chainId = getChainIdFromNetworkId(networkId);
  const chain = CHAINS[chainId];
  const explorer = EXPLORER_URLS[chainId];
  const registryAddress = getRegistryAddress("identity", chainId);

  if (!chain) {
    console.error(`❌ Unsupported network: ${networkId} (chain ${chainId})`);
    process.exit(1);
  }

  console.log(`📋 Configuration:`);
  console.log(`   Network: ${networkId} (${chainId})`);
  console.log(`   Agent ID: ${agentId}`);
  console.log(`   Wallet: ${agentWalletAddress}`);
  console.log(`   Registry: ${registryAddress}`);
  console.log(`   Name: ${agentName || `Agent ${agentId}`}`);
  console.log(`   Description: ${agentDescription || "(empty)"}`);
  console.log(`   x402 Support: ${x402Support}`);
  if (baseUrl) {
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`   API (free): ${baseUrl}/api/agent`);
    if (x402Support) console.log(`   API (premium): ${baseUrl}/api/agent/premium`);
  }
  console.log();

  // Initialize CDP wallet provider
  console.log("🔑 Initializing wallet...");
  const walletProvider = await CdpEvmWalletProvider.configureWithWallet({
    apiKeyId: process.env.CDP_API_KEY_ID!,
    apiKeySecret: process.env.CDP_API_KEY_SECRET!,
    walletSecret: process.env.CDP_WALLET_SECRET,
    networkId,
    address: agentWalletAddress,
    rpcUrl: process.env.RPC_URL,
  });

  const walletAddress = walletProvider.getAddress();
  console.log(`   Address: ${walletAddress}`);

  if (walletAddress.toLowerCase() !== agentWalletAddress.toLowerCase()) {
    console.error(`\n❌ Wallet address mismatch!`);
    console.error(`   Expected: ${agentWalletAddress}`);
    console.error(`   Got: ${walletAddress}`);
    process.exit(1);
  }

  // Create public client for reading
  const publicClient = createPublicClient({
    chain,
    transport: http(process.env.RPC_URL),
  });

  // Step 1: Generate and upload metadata to IPFS
  console.log("\n📤 Step 1: Generating and uploading metadata to IPFS...");

  try {
    const registration = generateAgentRegistration({
      agentId,
      chainId,
      registryAddress,
      name: agentName,
      description: agentDescription,
      image: agentImage,
      baseUrl,
      x402Support,
    });

    console.log(`   Name: ${registration.name}`);
    console.log(`   Description: ${registration.description || "(empty)"}`);
    console.log(`   Image: ${registration.image || "(empty)"}`);
    console.log(`   Services: ${registration.services.length} endpoint(s)`);
    console.log(`   x402 Support: ${registration.x402Support}`);
    console.log(`   Active: ${registration.active}`);
    console.log(`   Uploading to IPFS...`);

    const ipfsHash = await uploadJsonToIPFS(
      pinataJwt,
      registration,
      `agent-${agentId}-registration`,
    );
    const ipfsUri = `ipfs://${ipfsHash}`;
    const httpUrl = `https://ipfs.io/ipfs/${ipfsHash}`;

    console.log(`   ✅ Uploaded to IPFS!`);
    console.log(`   IPFS URI: ${ipfsUri}`);
    console.log(`   HTTP Gateway: ${httpUrl}`);

    // Step 2: Set agent URI on-chain
    console.log("\n📤 Step 2: Setting agent URI on-chain...");

    const setUriData = encodeFunctionData({
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "setAgentURI",
      args: [BigInt(agentId), ipfsUri],
    });

    const setUriHash = await walletProvider.sendTransaction({
      to: registryAddress,
      data: setUriData,
    });

    console.log(`   Transaction: ${explorer}/tx/${setUriHash}`);
    console.log("   Waiting for confirmation...");

    const setUriReceipt = await publicClient.waitForTransactionReceipt({ hash: setUriHash as Hex });

    if (setUriReceipt.status !== "success") {
      console.error("\n❌ Set URI transaction failed!");
      process.exit(1);
    }

    console.log(`   ✅ Agent URI updated on-chain!`);

    // Success!
    console.log("\n✅ Metadata update complete!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Owner: ${walletAddress}`);
    console.log(`   Registry: ${registryAddress}`);
    console.log(`   Network: ${networkId}`);
    console.log(`   Metadata URI: ${ipfsUri}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📋 Transaction:");
    console.log(`   ${explorer}/tx/${setUriHash}\n`);

    const scanPath = networkId === "base-sepolia" ? "base-sepolia" : "sepolia";
    console.log("🔗 View on 8004scan:");
    console.log(`   https://www.8004scan.io/agents/${scanPath}/${agentId}\n`);

  } catch (error) {
    console.error("\n❌ Metadata update failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
