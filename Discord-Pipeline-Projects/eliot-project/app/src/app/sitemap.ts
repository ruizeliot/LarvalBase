import { MetadataRoute } from 'next';
import { getSpeciesList } from '@/lib/services/species.service';
import { getOrLoadData } from '@/lib/data/data-repository';

const BASE_URL = 'https://larvalbase.ingevision.cloud';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Add all species pages
  const species = await getSpeciesList();
  for (const sp of species) {
    entries.push({
      url: `${BASE_URL}/species/${sp.id}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  // Add all family pages
  const data = await getOrLoadData();
  const families = new Set<string>();
  for (const sp of data.species.values()) {
    families.add(sp.family);
  }
  for (const family of [...families].sort()) {
    entries.push({
      url: `${BASE_URL}/families/${encodeURIComponent(family)}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  return entries;
}
