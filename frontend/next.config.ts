import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Validasi TypeScript tetap diaktifkan saat build
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
