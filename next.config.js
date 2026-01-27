/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@coinbase/agentkit",
  ],
};

export default nextConfig;
