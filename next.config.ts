import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark ssh2 and its dependencies as external packages
  // These are server-side only and contain native bindings
  serverExternalPackages: ["ssh2", "cpu-features"],
};

export default nextConfig;
