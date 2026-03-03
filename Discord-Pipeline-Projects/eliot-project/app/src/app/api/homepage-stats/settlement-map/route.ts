import { NextResponse } from 'next/server';
import { getOrLoadData } from '@/lib/data/data-repository';

/**
 * GET /api/homepage-stats/settlement-map
 *
 * Returns all GPS locations from settlement age and settlement size databases
 * for the homepage world map.
 */
export async function GET() {
  try {
    const data = await getOrLoadData();

    // Deduplicate by GPS coordinate to reduce payload size for homepage
    const seen = new Set<string>();
    const locations: Array<{
      latitude: number;
      longitude: number;
      location: string | null;
      country: string | null;
      year: number | null;
      traitType: string | null;
      value: number | null;
      unit: string | null;
      reference: string | null;
      link: string | null;
    }> = [];

    // Collect all settlement GPS points across all species
    for (const [, speciesLocations] of data.locationsBySpecies) {
      for (const loc of speciesLocations) {
        if (
          loc.latitude != null &&
          loc.longitude != null &&
          !isNaN(loc.latitude) &&
          !isNaN(loc.longitude) &&
          loc.traitType &&
          (loc.traitType === 'settlement_age' || loc.traitType === 'settlement_size')
        ) {
          // Deduplicate by rounded coordinates (4 decimal places)
          const key = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
          if (seen.has(key)) continue;
          seen.add(key);

          locations.push({
            latitude: loc.latitude,
            longitude: loc.longitude,
            location: loc.location,
            country: loc.country,
            year: loc.year,
            traitType: loc.traitType,
            value: loc.value,
            unit: loc.unit,
            reference: loc.reference,
            link: loc.link,
          });
        }
      }
    }

    return NextResponse.json(
      { locations },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (error) {
    console.error('Error loading settlement map data:', error);
    return NextResponse.json(
      { error: 'Failed to load settlement map data' },
      { status: 500 }
    );
  }
}
