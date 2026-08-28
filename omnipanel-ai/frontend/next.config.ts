import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Turbopack is the default bundler in Next.js 16+.
  // The agora-rtc-sdk-ng webpack external is handled via dynamic import instead.
  turbopack: {},
};

export default nextConfig;
