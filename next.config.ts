import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    const target = process.env.NEXT_PUBLIC_IAM_URL || "http://127.0.0.1:18080";
    return [
      {
        source: "/v1/iam/:path*",
        destination: `${target}/v1/iam/:path*`,
      },
      {
        source: "/v1/users/:path*",
        destination: `${target}/v1/users/:path*`,
      },
    ];
  },
};

export default nextConfig;