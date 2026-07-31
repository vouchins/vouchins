// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private pages are protected independently and return noindex headers.
      // API endpoints do not contain indexable documents.
      disallow: ['/api/'],
    },
    sitemap: 'https://www.vouchins.com/sitemap.xml',
  }
}
