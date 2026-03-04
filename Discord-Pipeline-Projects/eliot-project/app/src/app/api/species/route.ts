import { NextResponse } from 'next/server';
import { getAllSpeciesWithTaxonomy } from '@/lib/services/species.service';
import { getSpeciesWithImages, getSpeciesWithSureImages, getSpeciesWithUnsureImages } from '@/lib/data/image-registry';
import { getSpeciesWithGrowthModels } from '@/lib/services/growth.service';

export async function GET() {
  try {
    const [data, speciesWithImages, speciesWithSure, speciesWithUnsure, speciesWithGrowthModels] = await Promise.all([
      getAllSpeciesWithTaxonomy(),
      getSpeciesWithImages(),
      getSpeciesWithSureImages(),
      getSpeciesWithUnsureImages(),
      getSpeciesWithGrowthModels(),
    ]);

    // Convert species array to API response format, including traits
    const speciesList = data.species.map(s => {
      const traits = data.traitsBySpecies.get(s.id) || [];
      // Check if species has images (use original validName as that's what image registry uses)
      const hasImages = speciesWithImages.has(s.validName);
      const hasImagesSure = speciesWithSure.has(s.validName);
      const hasImagesUnsure = speciesWithUnsure.has(s.validName);
      const hasGrowthModel = speciesWithGrowthModels.has(s.validName);

      return {
        id: s.id,
        scientificName: s.validName,
        commonName: s.commonName,
        order: s.order,
        family: s.family,
        genus: s.genus,
        traits: traits.map(t => ({
          traitType: t.traitType,
          value: t.value,
          unit: t.unit,
        })),
        hasImages,
        hasImagesSure,
        hasImagesUnsure,
        hasGrowthModel,
      };
    });

    return NextResponse.json({
      species: speciesList,
      count: speciesList.length,
      fetchedAt: data.fetchedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error loading species data:', error);
    return NextResponse.json(
      { error: 'Failed to load species data' },
      { status: 500 }
    );
  }
}
