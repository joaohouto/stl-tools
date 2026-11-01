import type { MetadataRoute } from 'next';
import { PRODUCT_MODULES } from '@/models/registry';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://stl.joaocouto.com';
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/calculadora`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/imagem-para-svg`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  const modelRoutes: MetadataRoute.Sitemap = PRODUCT_MODULES.map((mod) => ({
    url: `${baseUrl}/models/${mod.schema.id}`,
    lastModified: new Date(mod.schema.addedAt || now),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  return [...staticRoutes, ...modelRoutes];
}
