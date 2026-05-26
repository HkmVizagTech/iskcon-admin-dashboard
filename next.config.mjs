/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warnings don't block production builds
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Type errors don't block production builds (they show in dev)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
