import { withAmplifyHosting } from '@aws-amplify/adapter-nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default withAmplifyHosting(nextConfig);
