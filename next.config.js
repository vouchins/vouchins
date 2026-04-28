/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  //Dont committ this to production
  reactStrictMode: false, // 👈 Add this line to stop double-renders

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
