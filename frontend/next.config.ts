import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
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
