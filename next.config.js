/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  //Dont committ this to production
  reactStrictMode: false, // 👈 Add this line to stop double-renders
  async rewrites() {
    return [
      {
        source: "/supabase/:path*",
        destination: "https://jwngedrohqftmyyomkzm.supabase.co/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
