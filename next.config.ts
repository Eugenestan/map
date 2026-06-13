import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s3.twcstorage.ru",
      },
      {
        protocol: "https",
        hostname: "*.twcstorage.ru",
      },
    ],
  },
};

export default nextConfig;
