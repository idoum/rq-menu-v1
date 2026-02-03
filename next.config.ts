import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Allow dev origins for tenant subdomains
  allowedDevOrigins: [
    'pizza.saasresto.localhost',
    '*.saasresto.localhost',
  ],
  
  // Production image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.saasresto.isprojets.cloud',
      },
      {
        protocol: 'https',
        hostname: 'saasresto.isprojets.cloud',
      },
    ],
    // Allow serving images from uploads
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Experimental features for better production performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', '@prisma/client'],
  },
};

export default nextConfig;
