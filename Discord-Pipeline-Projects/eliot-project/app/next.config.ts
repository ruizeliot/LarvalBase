import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /** Enable static page generation for species pages (ISR) */
  output: undefined, // Default: hybrid SSR+SSG
  experimental: {
    /** Optimize server components for faster TTFB */
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

export default nextConfig;
