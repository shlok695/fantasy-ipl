import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/ipl',
  // @ts-ignore
  allowedDevOrigins: ['100.70.66.90', 'svps.tail00dff0.ts.net'],
  // @ts-ignore
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
