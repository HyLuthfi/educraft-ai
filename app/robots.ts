import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://educraft.mahya.uno'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/contact',
          '/privacy',
          '/terms',
          '/security',
          '/login',
          '/register',
          '/forgot-password',
        ],
        disallow: [
          '/api/',
          '/create',
          '/library',
          '/bank-materi',
          '/koreksi',
          '/absensi',
          '/kelompok',
          '/perencana',
          '/play',
          '/profil',
          '/ranking',
          '/rapor',
          '/roda-undian',
          '/settings',
          '/dashboard',
          '/auth/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
