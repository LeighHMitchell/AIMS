/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Minimal config for development stability
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    domains: ['lhiayyjwkjkjkxvhcenw.supabase.co'],
  },
}

module.exports = nextConfig