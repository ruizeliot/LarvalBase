import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /** Enable static page generation for species pages (ISR) */
  output: undefined, // Default: hybrid SSR+SSG
  experimental: {
    /** Optimize server components for faster TTFB */
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: {
    /** Serve smaller thumbnails for grids */
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 192, 256],
  },
};

export default nextConfig;
