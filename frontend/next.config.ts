import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mode Static Export untuk web server HestiaCP (public_html)
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
