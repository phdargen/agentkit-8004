import { customActionProvider, EvmWalletProvider } from "@coinbase/agentkit";
import { Erc8004ActionProviderActionSchema } from "./schemas";
import { z } from "zod";

/**
 * Creates a Erc8004ActionProviderActionProvider action provider.
 * To create multiple actions, pass in an array of actions to createActionProvider.
 */
export const erc8004ActionProviderActionProvider = () =>
  customActionProvider<EvmWalletProvider>({
    name: "erc8004action_provider_action",
    description: `This tool will perform a Erc8004ActionProviderActionProvider operation.`,
    schema: Erc8004ActionProviderActionSchema,
    invoke: async (wallet: EvmWalletProvider, args: z.infer<typeof Erc8004ActionProviderActionSchema>) => {
      try {
        // Do work here
        return `Successfully performed erc8004action_provider_action and returned the response`;
      } catch (error) {
          return `Error performing erc8004action_provider_action: Error: ${error}`;
        }
      },
  });
