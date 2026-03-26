import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/ipl',
  images: {
    remotePatterns: [
      new URL('https://upload.wikimedia.org/**'),
      new URL('https://flagcdn.com/**'),
      new URL('https://ui-avatars.com/**'),
    ],
  },
  allowedDevOrigins: ['100.70.66.90', 'svps.tail00dff0.ts.net'],
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
