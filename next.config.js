/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  //Dont committ this to production
  reactStrictMode: false, // 👈 Add this line to stop double-renders
};

module.exports = nextConfig;
