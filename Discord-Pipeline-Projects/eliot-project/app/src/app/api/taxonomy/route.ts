import { NextResponse } from 'next/server';
import { getAllSpeciesWithTaxonomy } from '@/lib/services/species.service';
import { taxonomyToJSON } from '@/lib/services/taxonomy.service';

export async function GET() {
  try {
    const data = await getAllSpeciesWithTaxonomy();
    const taxonomyJSON = taxonomyToJSON(data.taxonomy);

    return NextResponse.json({
      taxonomy: taxonomyJSON,
      totalSpecies: data.taxonomy.speciesCount,
      fetchedAt: data.fetchedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error loading taxonomy data:', error);
    return NextResponse.json(
      { error: 'Failed to load taxonomy data' },
      { status: 500 }
    );
  }
}
