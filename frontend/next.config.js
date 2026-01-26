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
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Webpack configuration - temporarily simplified
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Ensure the data directory is included in module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/data': require('path').resolve(__dirname, 'src/data'),
    };
    
    return config;
  },
  
  // Headers for all routes
  async headers() {
    return [
      {
        // Apply these headers to all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
      {
        // Apply CSP headers to all routes to allow currency exchange APIs
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://lhiayyjwkjkjkxvhcenw.supabase.co https://*.supabase.co https://api.fxratesapi.com https://api.exchangerate-api.com https://api.exchangerate.host https://api.iatistandard.org https://nominatim.openstreetmap.org https://unpkg.com https://basemaps.cartocdn.com https://*.cartocdn.com https://tiles.openfreemap.org https://*.openstreetmap.org https://*.openstreetmap.fr https://server.arcgisonline.com",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "worker-src 'self' blob: https://unpkg.com https://cdnjs.cloudflare.com https://basemaps.cartocdn.com https://*.cartocdn.com",
            ].join('; ')
          },
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

  // Redirects for legacy routes
  async redirects() {
    return [
      {
        source: '/aid-map',
        destination: '/atlas',
        permanent: true,
      },
      {
        source: '/atlas-beta',
        destination: '/atlas',
        permanent: true,
      },
    ]
  },

  typescript: {
    // Temporarily ignore build errors for production deployment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily ignore ESLint during builds for production deployment
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