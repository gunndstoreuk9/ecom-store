import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/products/american-sugar-balance-complex",
        destination: "/products/balance",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
