import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict React mode for catching issues early
  reactStrictMode: true,

  // Optimize external packages
  serverExternalPackages: ['@anthropic-ai/sdk'],

  // Security headers are in vercel.json

  // Reduce bundle by excluding source maps in production
  productionBrowserSourceMaps: false,

  // Compress responses
  compress: true,

  // Powered-by 헤더 비활성화 (보안)
  poweredByHeader: false,
};

export default nextConfig;
