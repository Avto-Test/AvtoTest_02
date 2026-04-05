import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
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
