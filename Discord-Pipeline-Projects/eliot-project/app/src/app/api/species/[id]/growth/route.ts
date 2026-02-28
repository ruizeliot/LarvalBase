/**
 * API endpoint for species growth model data.
 * GET /api/species/[id]/growth
 */

import { NextResponse } from 'next/server';
import { getGrowthDataForSpecies, loadGrowthModels } from '@/lib/services/growth.service';
import { getAxisCapsForSpecies } from '@/lib/services/axis-caps.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { curves, rawPoints } = await getGrowthDataForSpecies(id);
    console.log(`[growth API] speciesId=${id}, curves=${curves.length} (points: ${curves.map(c => c.points.length).join(',')}), rawPoints=${rawPoints.length}`);

    // Get taxonomy info for axis cap fallback
    let speciesName = '';
    let genus = '';
    let family = '';

    if (curves.length > 0) {
      const model = curves[0].model;
      speciesName = model.speciesName;
      // Extract genus from species name (first word)
      genus = model.speciesName.split(' ')[0] || '';
    } else {
      // Try to find taxonomy from growth models database
      const allModels = await loadGrowthModels();
      const match = allModels.find(m => m.speciesId === id);
      if (match) {
        speciesName = match.speciesName;
        genus = match.speciesName.split(' ')[0] || '';
      }
    }

    // Fetch axis caps with species → genus → family fallback
    const axisCaps = await getAxisCapsForSpecies(speciesName, genus, family);

    return NextResponse.json({
      speciesId: id,
      curves,
      rawPoints,
      curveCount: curves.length,
      rawPointCount: rawPoints.length,
      axisCaps,
    });
  } catch (error) {
    console.error('Error fetching growth data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch growth data' },
      { status: 500 }
    );
  }
}
