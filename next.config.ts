import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ws"],
  allowedDevOrigins: ["*"],
};
export default nextConfig;
