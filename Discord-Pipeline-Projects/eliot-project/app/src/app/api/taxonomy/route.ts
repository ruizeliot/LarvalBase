import { NextResponse } from 'next/server';
import { getAllSpeciesWithTaxonomy, isGenusOrFamilyLevelId } from '@/lib/services/species.service';
import { taxonomyToJSON } from '@/lib/services/taxonomy.service';

export async function GET() {
  try {
    const data = await getAllSpeciesWithTaxonomy();
    const taxonomyJSON = taxonomyToJSON(data.taxonomy);

    // Use filtered count (excluding genus/family-level IDs) to match /api/species count
    const filteredCount = data.species.filter(s => !isGenusOrFamilyLevelId(s.validName)).length;
    taxonomyJSON.speciesCount = filteredCount;

    return NextResponse.json({
      taxonomy: taxonomyJSON,
      totalSpecies: filteredCount,
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
