import {
  AgentKit,
  cdpApiActionProvider,
  cdpEvmWalletActionProvider,
  CdpEvmWalletProvider,
  erc20ActionProvider,
  pythActionProvider,
  walletActionProvider,
  WalletProvider,
  wethActionProvider,
  x402ActionProvider,
} from "@coinbase/agentkit";
import * as fs from "fs";
import { erc8004ActionProvider, registerAgent } from "@/actions/erc8004";
import {
  bootstrapAgentIdentity,
  setAgentIdentity,
  buildMetadataURI,
} from "@/lib/erc8004";

/**
 * AgentKit Integration Route
 *
 * This file is your gateway to integrating AgentKit with your product.
 * It defines the core capabilities of your agent through WalletProvider
 * and ActionProvider configuration.
 *
 * Key Components:
 * 1. WalletProvider Setup:
 *    - Configures the blockchain wallet integration
 *    - Learn more: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#evm-wallet-providers
 *
 * 2. ActionProviders Setup:
 *    - Defines the specific actions your agent can perform
 *    - Choose from built-in providers or create custom ones:
 *      - Built-in: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#action-providers
 *      - Custom: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#creating-an-action-provider
 *
 * # Next Steps:
 * - Explore the AgentKit README: https://github.com/coinbase/agentkit
 * - Experiment with different LLM configurations
 * - Fine-tune agent parameters for your use case
 *
 * ## Want to contribute?
 * Join us in shaping AgentKit! Check out the contribution guide:
 * - https://github.com/coinbase/agentkit/blob/main/CONTRIBUTING.md
 * - https://discord.gg/CDP
 */

// Configure a file to persist the agent's CDP MPC Wallet Data
const WALLET_DATA_FILE = "wallet_data.txt";

/**
 * Prepares the AgentKit and WalletProvider.
 *
 * @function prepareAgentkitAndWalletProvider
 * @returns {Promise<{ agentkit: AgentKit, walletProvider: WalletProvider }>} The initialized AI agent.
 *
 * @description Handles agent setup
 *
 * @throws {Error} If the agent initialization fails.
 */
export async function prepareAgentkitAndWalletProvider(): Promise<{
  agentkit: AgentKit;
  walletProvider: WalletProvider;
}> {
  if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) {
    throw new Error(
      "I need both CDP_API_KEY_ID and CDP_API_KEY_SECRET in your .env file to connect to the Coinbase Developer Platform.",
    );
  }

  try {

    // Initialize WalletProvider: https://docs.cdp.coinbase.com/agentkit/docs/wallet-management
    const walletProvider = await CdpEvmWalletProvider.configureWithWallet({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
      networkId: process.env.NETWORK_ID || "base-sepolia",
      address: process.env.AGENT_WALLET_ADDRESS as `0x${string}`,
      rpcUrl: process.env.RPC_URL,
    });

    // Initialize AgentKit: https://docs.cdp.coinbase.com/agentkit/docs/agent-actions
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        wethActionProvider(),
        pythActionProvider(),
        walletActionProvider(),
        erc20ActionProvider(),
        cdpApiActionProvider(),
        cdpEvmWalletActionProvider(),
        x402ActionProvider(),
        erc8004ActionProvider(), // ERC-8004 identity & reputation actions
      ],
    });

    // Save wallet data
    const exportedWallet = await walletProvider.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

    // Bootstrap agent identity after wallet setup
    await bootstrapAndRegisterIdentity(walletProvider);

    return { agentkit, walletProvider };
  } catch (error) {
    console.error("Error initializing agent:", error);
    throw new Error("Failed to initialize agent");
  }
}

/**
 * Bootstrap agent identity and register if needed.
 *
 * This function:
 * 1. Initializes the agent state (chain info, registries)
 * 2. Checks if agent is already registered (via AGENT_ID env var)
 * 3. If REGISTER_IDENTITY=true and not registered, calls registerAgent directly
 * 
 */
async function bootstrapAndRegisterIdentity(
  walletProvider: CdpEvmWalletProvider,
): Promise<void> {
  // First, bootstrap to check existing identity (pass wallet address)
  const agentAddress = walletProvider.getAddress();
  const state = await bootstrapAgentIdentity(agentAddress);

  // If already registered, nothing more to do
  if (state.isRegistered) {
    console.log(`[ERC-8004] Agent already registered with ID: ${state.agentId}`);
    return;
  }

  // Check if auto-registration is enabled
  const shouldRegister = process.env.REGISTER_IDENTITY === "true";
  if (!shouldRegister) {
    console.log("[ERC-8004] Auto-registration disabled (REGISTER_IDENTITY != true)");
    return;
  }

  // Build the agent metadata URI from domain
  const domain = process.env.AGENT_DOMAIN || "localhost:3000";
  const agentURI = buildMetadataURI(domain);

  console.log(`[ERC-8004] Registering agent with URI: ${agentURI}`);

  // Call the registerAgent action directly (same function used by the action provider)
  const result = await registerAgent(walletProvider, { agentURI });

  // Parse the result to extract agent ID
  // The registerAgent function returns a formatted string with the agent ID
  const agentIdMatch = result.match(/Agent ID: (\d+)/);
  if (agentIdMatch) {
    const agentId = agentIdMatch[1];
    const agentAddress = walletProvider.getAddress();

    // Update the agent state with the new registration
    setAgentIdentity(agentId, agentAddress, agentURI);

    console.log(`[ERC-8004] Successfully registered agent with ID: ${agentId}`);
  } else {
    console.log(`[ERC-8004] Registration result: ${result}`);
  }
}
