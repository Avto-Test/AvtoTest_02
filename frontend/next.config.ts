import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true,
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/tests/details/:id",
        destination: "/practice-tests/details/:id",
        statusCode: 301,
      },
      {
        source: "/tests/details/:id/attempt",
        destination: "/practice-tests/details/:id/attempt",
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
