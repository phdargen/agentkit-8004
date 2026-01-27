/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Externalize these packages to prevent webpack bundling issues
  // Include the full dependency chain to avoid ESM/CJS conflicts
  serverExternalPackages: [
    "@coinbase/agentkit",
    "@coinbase/agentkit-langchain", 
    "@coinbase/agentkit-vercel-ai-sdk",
    "@coinbase/cdp-sdk",
    // ESM packages that must be externalized together to avoid require() issues
    "jose",
    "@noble/hashes",
    "@noble/curves",
    "viem",
    "@scure/bip32",
    "@scure/bip39",
    "@scure/base",
  ],

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure proper resolution of ESM modules
      config.resolve.extensionAlias = {
        ".js": [".ts", ".tsx", ".js", ".jsx"],
        ".mjs": [".mts", ".mjs"],
      };
    }
    
    return config;
  },
};

export default nextConfig;
