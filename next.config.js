/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: 'output: export' is removed for development with dynamic routes
  // For production static export, you'll need to add generateStaticParams to dynamic routes
  // or use a different deployment strategy (Vercel handles this automatically)
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
