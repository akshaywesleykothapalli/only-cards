/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow cross-origin requests from 127.0.0.1 during local development
  allowedDevOrigins: ['http://127.0.0.1:3000', 'http://localhost:3000'],
};

module.exports = nextConfig;
