import { NextResponse } from 'next/server';
import { getRaftingData } from '@/lib/services/rafting-qualitative.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getRaftingData(id);

    if (data === null) {
      return NextResponse.json(
        { data: null },
        { status: 200 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error loading rafting data:', error);
    return NextResponse.json(
      { error: 'Failed to load rafting data' },
      { status: 500 }
    );
  }
}
