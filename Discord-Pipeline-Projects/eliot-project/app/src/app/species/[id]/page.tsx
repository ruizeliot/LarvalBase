import { getSpeciesList } from '@/lib/services/species.service';
import { SpeciesDetail } from '@/components/species-detail/species-detail';

/**
 * ISR revalidation interval: 1 hour.
 * Pages are served as static HTML, regenerated in background after 1 hour.
 */
export const revalidate = 3600;

/**
 * Generate static params for all species pages at build time.
 * Enables ISR pre-rendering for every known species.
 */
export async function generateStaticParams() {
  const species = await getSpeciesList();
  return species.map((s) => ({ id: s.id }));
}

/**
 * Species detail page — ISR pre-rendered.
 */
export default async function SpeciesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <SpeciesDetail speciesId={id} />;
}
