import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // 锁定构建根目录：避免上层目录的 lockfile 让追踪路径嵌套成 Desktop/Web5.blog
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
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
