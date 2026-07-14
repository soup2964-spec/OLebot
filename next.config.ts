import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/variants", destination: "/", permanent: false },
      { source: "/experiment", destination: "/", permanent: false },
      { source: "/personas", destination: "/", permanent: false },
      { source: "/behavior", destination: "/", permanent: false },
      { source: "/results", destination: "/", permanent: false },
      { source: "/evolution", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
