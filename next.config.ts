import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark ssh2 and its dependencies as external packages
  // These are server-side only and contain native bindings
  serverExternalPackages: ["ssh2", "cpu-features"],
  
  // Empty turbopack config to silence the warning
  turbopack: {},
  
  // Configure webpack for WASM support (used by argon2-browser)
  webpack: (config, { isServer }) => {
    // Enable WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Fix WASM loading
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // Don't bundle argon2-browser on server
    if (isServer) {
      config.externals = [...(config.externals || []), "argon2-browser"];
    }

    return config;
  },
};

export default nextConfig;
