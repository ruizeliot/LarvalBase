/**
 * GET /api/species/[id]/export-all-traits
 *
 * Returns CSV of ALL traits for a species in long format.
 * Columns: ORDER, FAMILY, GENUS, VALID_NAME, APHIA_ID, AUTHORITY, ORIGINAL_NAME,
 * EGG_LOCATION, EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE,
 * PELAGIC_JUVENILE, RAFTING_FLOATSAM, RAFTING_STAGE,
 * QUANTITATIVE_TYPE, MEAN, MIN, MAX, CONF, MEAN_TYPE, CONF_TYPE,
 * VOLUME_TYPE, UNIT, LENGTH_TYPE,
 * TEMPERATURE_MEAN, TEMPERATURE_MIN, TEMPERATURE_MAX, TEMPERATURE_MEAN_TYPE,
 * EXT_REF, REFERENCE, LINK
 */
import { NextResponse } from 'next/server';
import { getAllTraitsExport, rowsToCsv } from '@/lib/services/all-traits-export.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const speciesId = decodeURIComponent(id).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const result = await getAllTraitsExport(speciesId);
    if (!result) {
      return NextResponse.json({ error: 'Species not found' }, { status: 404 });
    }

    const csv = rowsToCsv(result.columns, result.rows);
    const filename = `${speciesId}_all_traits.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('[export-all-traits] Error:', error);
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}
