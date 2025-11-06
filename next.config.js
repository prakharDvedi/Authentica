/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'ipfs-http-client': 'commonjs ipfs-http-client',
      });
    }
    
    return config;
  },
  images: {
    domains: ['ipfs.io', 'gateway.pinata.cloud'],
  },
};

module.exports = nextConfig;
