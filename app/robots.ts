// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Disallow crawling of internal/private app routes
      disallow: [
        '/feed/', 
        '/dashboard/', 
        '/settings/', 
        '/admin/',
        '/api/' // Standard practice to hide your internal API routes
      ],
    },
    sitemap: 'https://vouchins.com/sitemap.xml',
  }
}