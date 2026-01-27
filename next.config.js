/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Transpile ESM packages that need proper handling
  transpilePackages: [
    "@noble/hashes",
    "@noble/curves",
    "@coinbase/agentkit",
    "@coinbase/agentkit-langchain",
  ],

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Fix for @noble/hashes ESM module bundling issue
      // The error "Y is not a function" occurs because webpack incorrectly transforms ESM exports
      // Solution: Treat @noble packages as ESM and don't transform them
      config.module.rules.push({
        test: /node_modules\/@noble\/(hashes|curves)\/.*\.js$/,
        type: "javascript/auto",
        resolve: {
          fullySpecified: false,
        },
      });

      // Disable minification for server-side builds to prevent function reference issues
      // This is safe because server code doesn't need to be minified for size
      if (config.optimization?.minimize) {
        config.optimization.minimize = false;
      }
    }

    return config;
  },
};

export default nextConfig;
