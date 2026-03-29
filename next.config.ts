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

  // Long-term cache for static assets with content hash
  headers: async () => [
    {
      source: '/_next/static/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
};

export default nextConfig;
