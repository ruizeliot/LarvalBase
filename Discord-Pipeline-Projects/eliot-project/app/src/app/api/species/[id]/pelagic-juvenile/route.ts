import { NextResponse } from 'next/server';
import { getPelagicJuvenileData } from '@/lib/services/pelagic-juvenile-qualitative.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getPelagicJuvenileData(id);

    if (data === null) {
      return NextResponse.json(
        { data: null },
        { status: 200 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error loading pelagic juvenile data:', error);
    return NextResponse.json(
      { error: 'Failed to load pelagic juvenile data' },
      { status: 500 }
    );
  }
}
