import type { NextConfig } from 'next';
const config: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  outputFileTracingIncludes: { '/plan/pdf': ['./public/recetas/**/*'] },
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
};
export default config;
