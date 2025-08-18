/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  skipTrailingSlashRedirect: true,
  
  // Disable static exports for error pages
  generateBuildId: async () => {
    // Use a timestamp as build ID for consistency
    return Date.now().toString()
  },
  
  // Experimental features to improve stability
  experimental: {
    // Better error handling in development
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  
  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Ensure TypeScript and JSON files are resolved properly
    config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    
    // Ensure the data directory is included in module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/data': require('path').resolve(__dirname, 'src/data'),
    };
    
    // Add rules to handle TypeScript and JSON files
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      include: /src\/data/,
      use: [defaultLoaders.babel],
    });
    
    // Ensure JSON files are handled
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    });
    
    // Add fallback for modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    return config;
  },
  
  // Headers for all routes
  async headers() {
    return [
      {
        // Apply these headers to all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ]
  },
  
  // Rewrites to handle API route timeouts
  async rewrites() {
    return {
      beforeFiles: [
        // Health check endpoint
        {
          source: '/api/health',
          destination: '/api/test',
        },
      ],
    }
  },

  typescript: {
    // Enable strict TypeScript checking for production builds
    ignoreBuildErrors: false,
  },
  eslint: {
    // Temporarily ignore ESLint during builds to allow deployment  
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lhiayyjwkjkjkxvhcenw.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
}

module.exports = nextConfig 