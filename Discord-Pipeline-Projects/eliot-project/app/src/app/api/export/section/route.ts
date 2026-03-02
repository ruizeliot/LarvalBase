import { NextResponse } from 'next/server';
import { getSectionExportData } from '@/lib/services/section-export.service';

/**
 * GET /api/export/section?speciesId=X&level=species|genus|family&traits=a,b,c
 *
 * Returns raw CSV rows for export at the specified taxonomy level,
 * filtered by the given trait keys.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const speciesId = url.searchParams.get('speciesId');
    const level = url.searchParams.get('level') as 'species' | 'genus' | 'family';
    const traitsParam = url.searchParams.get('traits');

    if (!speciesId || !level || !traitsParam) {
      return NextResponse.json(
        { error: 'Missing required params: speciesId, level, traits' },
        { status: 400 }
      );
    }

    if (!['species', 'genus', 'family'].includes(level)) {
      return NextResponse.json(
        { error: 'level must be species, genus, or family' },
        { status: 400 }
      );
    }

    const traitKeys = traitsParam.split(',').filter(Boolean);
    const rows = await getSectionExportData(speciesId, traitKeys, level);

    if (rows === null) {
      return NextResponse.json(
        { error: 'Species not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ rows, count: rows.length });
  } catch (error) {
    console.error('Error in section export:', error);
    return NextResponse.json(
      { error: 'Failed to generate export data' },
      { status: 500 }
    );
  }
}
