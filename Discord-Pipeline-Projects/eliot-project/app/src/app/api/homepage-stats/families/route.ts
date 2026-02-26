import { NextResponse } from 'next/server';
import { getOrLoadData } from '@/lib/data/data-repository';

/**
 * GET /api/homepage-stats/families
 *
 * Returns family photo grid data: one entry per family, sorted by order.
 * Each entry includes the family name, order, species list with record counts.
 */
export async function GET() {
  try {
    const data = await getOrLoadData();

    // Group species by family
    const familyMap = new Map<string, {
      family: string;
      order: string;
      species: { validName: string; genus: string; records: number }[];
    }>();

    for (const sp of data.species.values()) {
      if (!familyMap.has(sp.family)) {
        familyMap.set(sp.family, {
          family: sp.family,
          order: sp.order,
          species: [],
        });
      }
      const fam = familyMap.get(sp.family)!;
      // Count records (traits) for this species
      const traits = data.traitsBySpecies.get(sp.id) || [];
      fam.species.push({
        validName: sp.validName,
        genus: sp.genus,
        records: traits.length,
      });
    }

    // Sort families by order, then family name
    const families = Array.from(familyMap.values())
      .sort((a, b) => a.order.localeCompare(b.order) || a.family.localeCompare(b.family))
      .map((f) => ({
        ...f,
        imageUrl: null, // Will be populated when image registry is connected
      }));

    return NextResponse.json({ families });
  } catch (error) {
    console.error('Error loading family data:', error);
    return NextResponse.json(
      { error: 'Failed to load family data' },
      { status: 500 }
    );
  }
}
