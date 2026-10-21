import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    // Read with fs at run time: the database CA and the notices (lib/server/notices.ts).
    '/*': ['./lib/certs/supabase-ca.crt', './content/notices/*.md'],
  },
};

export default nextConfig;
