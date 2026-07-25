import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "file.hu60.cn" },
      { protocol: "https", hostname: "hu60.cn" }
    ]
  }
};

export default nextConfig;
