// next.config.mjs defines configuration overrides for the Next.js runtime used by hazo_connect.
/** @type {import('next').NextConfig} */
const next_config = {
  reactStrictMode: true,
  transpilePackages: ["hazo_config"],
  experimental: {
    typedRoutes: true
  },
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...(config.experiments ?? {}),
      asyncWebAssembly: true
    }
    config.module = config.module ?? {}
    config.module.rules = config.module.rules ?? []
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource"
    })
    
    // Ensure sql.js is external on server-side to avoid module.exports issues
    if (isServer) {
      config.externals = config.externals || []
      if (typeof config.externals === 'function') {
        const originalExternals = config.externals
        config.externals = [
          ...(Array.isArray(originalExternals) ? originalExternals : []),
          'sql.js'
        ]
      } else if (Array.isArray(config.externals)) {
        config.externals.push('sql.js')
      }
    }
    
    return config
  }
};

export default next_config;

