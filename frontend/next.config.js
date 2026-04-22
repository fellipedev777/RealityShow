/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000',
  },
  images: {
    domains: ['api.dicebear.com', 'avatars.githubusercontent.com', 'lh3.googleusercontent.com'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
  }
};

module.exports = nextConfig;
