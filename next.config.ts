import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { '/*': ['./lib/certs/supabase-ca.crt'] },
};

export default nextConfig;
