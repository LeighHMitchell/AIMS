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
  
  // Headers for all routes
  async headers() {
    // Get allowed origins from environment variable
    const allowedOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return [
      {
        // Apply these headers to all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { 
            key: 'Access-Control-Allow-Origin', 
            value: isDevelopment ? '*' : allowedOrigins 
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
          // Security headers
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
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