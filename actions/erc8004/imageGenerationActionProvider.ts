import { z } from "zod";
import { customActionProvider, EvmWalletProvider } from "@coinbase/agentkit";
import { GenerateImageSchema } from "./schemas";

/**
 * Generate an AI image based on user's description.
 * This action does not generate the image directly - it returns a flag
 * that triggers the paid image generation flow on the frontend.
 */
async function generateImage(
  _walletProvider: EvmWalletProvider,
  args: z.infer<typeof GenerateImageSchema>,
): Promise<string> {
  return JSON.stringify({
    generateImg: true,
    prompt: args.prompt,
    message: "Image generation initiated. Please confirm payment in your wallet.",
  });
}

/**
 * Factory function to create image generation action provider.
 * Returns an action provider with the generate_image action.
 */
export const imageGenerationActionProvider = () =>
  customActionProvider<EvmWalletProvider>([
    {
      name: "generate_image",
      description: `Generate an AI image based on a user's description.
This action should be used when the user asks to create, generate, or make an image.
IMPORTANT: This action does not generate the image directly. It initiates a paid image generation flow.
The user will be prompted to confirm payment via their wallet.

It takes the following input:
- prompt: A detailed description of the image to generate (3-4000 characters)

Returns a flag indicating image generation should be triggered on the frontend.`,
      schema: GenerateImageSchema,
      invoke: generateImage,
    },
  ]);
