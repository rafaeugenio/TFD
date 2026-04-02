import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@supabase/supabase-js",
      "recharts",
      "react-day-picker",
    ],
  },
};

export default nextConfig;
