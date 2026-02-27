import { NextResponse } from 'next/server';
import { getEggQualitativeData } from '@/lib/services/egg-qualitative.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getEggQualitativeData(id);

    if (data === null) {
      return NextResponse.json(
        { data: null },
        { status: 200 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error loading egg qualitative data:', error);
    return NextResponse.json(
      { error: 'Failed to load egg qualitative data' },
      { status: 500 }
    );
  }
}
