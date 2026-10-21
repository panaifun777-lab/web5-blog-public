import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/llms.txt", destination: "/api/market/llms" },
        { source: "/.well-known/x402-market.json", destination: "/api/market/x402-market" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
};

export default nextConfig;
