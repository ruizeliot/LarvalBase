/**
 * API endpoint for species growth model data.
 * GET /api/species/[id]/growth
 */

import { NextResponse } from 'next/server';
import {
  getGrowthDataForSpecies,
  loadGrowthModels,
  getRawGrowthExportData,
  getGrowthModelExportData,
} from '@/lib/services/growth.service';
import { getAxisCapsForSpecies } from '@/lib/services/axis-caps.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { curves, weightCurves, rawPoints, tempRange } = await getGrowthDataForSpecies(id);
    const allCurves = [...curves, ...weightCurves];
    console.log(`[growth API] speciesId=${id}, lengthCurves=${curves.length}, weightCurves=${weightCurves.length}, rawPoints=${rawPoints.length}`);

    // Get taxonomy info for axis cap fallback
    let speciesName = '';
    let genus = '';
    const family = '';

    if (allCurves.length > 0) {
      const model = allCurves[0].model;
      speciesName = model.speciesName;
      genus = model.speciesName.split(' ')[0] || '';
    } else {
      const allModels = await loadGrowthModels();
      const match = allModels.find(m => m.speciesId === id);
      if (match) {
        speciesName = match.speciesName;
        genus = match.speciesName.split(' ')[0] || '';
      }
    }

    // Fetch axis caps with species → genus → family fallback
    const axisCaps = await getAxisCapsForSpecies(speciesName, genus, family);

    // Export data
    const [rawExport, modelExport] = await Promise.all([
      getRawGrowthExportData(id),
      getGrowthModelExportData(id),
    ]);

    // Fill species name in raw export rows
    for (const row of rawExport) {
      row['Species'] = speciesName;
    }

    return NextResponse.json({
      speciesId: id,
      curves,
      weightCurves,
      rawPoints,
      curveCount: curves.length,
      weightCurveCount: weightCurves.length,
      rawPointCount: rawPoints.length,
      axisCaps,
      tempRange,
      rawExport,
      modelExport,
    });
  } catch (error) {
    console.error('Error fetching growth data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch growth data' },
      { status: 500 }
    );
  }
}
