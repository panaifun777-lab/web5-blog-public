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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'self'",
          },
          { key: "X-XSS-Protection", value: "0" },
        ],
      },
    ];
  },
  reactStrictMode: false,
  devIndicators: false,
};

export default nextConfig;
