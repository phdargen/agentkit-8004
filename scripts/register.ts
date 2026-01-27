#!/usr/bin/env npx tsx
/**
 * ERC-8004 Agent Registration Script
 *
 * This script registers your agent on the ERC-8004 Identity Registry.
 * Run this ONCE before deploying your agent.
 *
 * Usage:
 *   pnpm register
 *
 * Requirements:
 *   - CDP_API_KEY_ID and CDP_API_KEY_SECRET in .env
 *   - CDP_WALLET_SECRET in .env
 *   - AGENT_WALLET_ADDRESS in .env
 *   - NETWORK_ID in .env (e.g., "base-sepolia")
 *   - AGENT_DOMAIN in .env (e.g., "myagent.example.com")
 *
 * After registration, add the output AGENT_ID to your .env file.
 */

import "dotenv/config";
import { createPublicClient, http, decodeEventLog, encodeFunctionData, type Hex, type Chain } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { CdpEvmWalletProvider } from "@coinbase/agentkit";

// Reuse existing constants and ABIs
import {
  getRegistryAddress,
  getChainIdFromNetworkId,
  DEFAULT_NETWORK_ID,
} from "../actions/erc8004/constants.js";
import { IDENTITY_REGISTRY_ABI } from "../actions/erc8004/abis.js";
import { buildMetadataURI } from "../lib/erc8004/bootstrap.js";

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
// Main
// ============================================================================

async function main() {
  console.log("\n🚀 ERC-8004 Agent Registration\n");

  // Validate environment
  const requiredEnvVars = [
    "CDP_API_KEY_ID",
    "CDP_API_KEY_SECRET",
    "CDP_WALLET_SECRET",
    "AGENT_WALLET_ADDRESS",
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  const networkId = process.env.NETWORK_ID || DEFAULT_NETWORK_ID;
  const domain = process.env.AGENT_DOMAIN || "localhost:3000";
  const agentWalletAddress = process.env.AGENT_WALLET_ADDRESS as Hex;

  // Get chain config from existing constants
  const chainId = getChainIdFromNetworkId(networkId);
  const chain = CHAINS[chainId];
  const explorer = EXPLORER_URLS[chainId];
  const registryAddress = getRegistryAddress("identity", chainId);

  if (!chain) {
    console.error(`❌ Unsupported network: ${networkId} (chain ${chainId})`);
    process.exit(1);
  }

  // Check if already registered
  if (process.env.AGENT_ID) {
    console.log(`⚠️  AGENT_ID already set in .env: ${process.env.AGENT_ID}`);
    console.log("   If you want to re-register, remove AGENT_ID from .env first.\n");
    process.exit(0);
  }

  console.log(`📋 Configuration:`);
  console.log(`   Network: ${networkId} (${chainId})`);
  console.log(`   Domain: ${domain}`);
  console.log(`   Wallet: ${agentWalletAddress}`);
  console.log(`   Registry: ${registryAddress}\n`);

  // Build agent URI using existing function
  const agentURI = buildMetadataURI(domain);
  console.log(`📝 Agent URI: ${agentURI}\n`);

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

  // Register on-chain
  console.log("\n📤 Registering agent on-chain...");

  try {
    // Encode the register call using viem
    const data = encodeFunctionData({
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "register",
      args: [agentURI],
    });

    // Use walletProvider to send the transaction
    const hash = await walletProvider.sendTransaction({
      to: registryAddress,
      data,
    });

    console.log(`   Transaction: ${explorer}/tx/${hash}`);
    console.log("   Waiting for confirmation...");

    // Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as Hex });

    if (receipt.status !== "success") {
      console.error("\n❌ Transaction failed!");
      process.exit(1);
    }

    // Parse the Registered event to get agentId
    let agentId: string | null = null;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === registryAddress.toLowerCase()) {
        try {
          const decoded = decodeEventLog({
            abi: IDENTITY_REGISTRY_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === "Registered") {
            agentId = (decoded.args as { agentId: bigint }).agentId.toString();
            break;
          }
        } catch {
          // Not the event we're looking for
        }
      }
    }

    if (!agentId) {
      console.error("\n⚠️  Could not extract agentId from transaction logs");
      console.error("   Check the transaction manually on the block explorer");
      process.exit(1);
    }

    // Success!
    console.log("\n✅ Registration successful!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Owner: ${walletAddress}`);
    console.log(`   Registry: ${registryAddress}`);
    console.log(`   Network: ${networkId}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📝 Add this to your .env file:\n");
    console.log(`   AGENT_ID=${agentId}\n`);

    const scanPath = networkId === "base-sepolia" ? "base-sepolia" : "eth-sepolia";
    console.log("🔗 View on 8004scan:");
    console.log(`   https://www.8004scan.io/agents/${scanPath}/${agentId}\n`);

  } catch (error) {
    console.error("\n❌ Registration failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
