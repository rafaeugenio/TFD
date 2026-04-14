import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@supabase/supabase-js",
      "recharts",
      "react-day-picker",
    ],
  },
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      // Prevent .next/dev/types/validator.ts from triggering recompilation loops
      ignored: /\.next[\\/]/,
    };
    return config;
  },
};

export default nextConfig;
