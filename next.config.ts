import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  allowedDevOrigins: ["192.168.3.99"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "file.hu60.cn" },
      { protocol: "https", hostname: "hu60.cn" }
    ]
  }
};

export default nextConfig;
