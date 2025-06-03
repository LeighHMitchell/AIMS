/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Increase the default timeout for API routes
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  
  // Experimental features to improve stability
  experimental: {
    // Improves hot reload performance
    optimizeCss: true,
    // Better error handling in development
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
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
}

module.exports = nextConfig 