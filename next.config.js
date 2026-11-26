/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  serverExternalPackages: ['pdfjs-dist', 'pdf-parse', 'mammoth'],
  outputFileTracingIncludes: {
    '/api/jobs/extract': ['./node_modules/pdfjs-dist/legacy/build/**'],
  },

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
