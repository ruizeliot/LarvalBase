import { NextRequest, NextResponse } from 'next/server';
import { getFamilyBarChartData, getGenusBarChartData, getGenusAveragedFamilyData, getOrderBarChartData } from '@/lib/services/aggregation.service';
import { getOrLoadData } from '@/lib/data/data-repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const trait = url.searchParams.get('trait');

    if (!trait) {
      return NextResponse.json(
        { error: 'Missing trait query parameter' },
        { status: 400 }
      );
    }

    // Get species to find its family and genus
    const data = await getOrLoadData();
    const species = data.species.get(id);

    if (!species) {
      return NextResponse.json(
        { error: 'Species not found' },
        { status: 404 }
      );
    }

    // Get family bar chart data
    const familyData = await getFamilyBarChartData(species.family, trait);

    // Also fetch order-level chart data (family averages within the order)
    const orderData = await getOrderBarChartData(species.order, trait);

    if (!familyData) {
      // Fallback: if no family data, try order-level chart
      if (orderData && orderData.species.length > 1) {
        return NextResponse.json({
          ...orderData,
          comparisonType: 'order',
          taxonomyName: species.order,
        });
      }
      return NextResponse.json(
        { error: 'No family data found for this trait' },
        { status: 404 }
      );
    }

    // If >20 species in family, show only species from the same genus
    // → "Genus Comparison(GENUS_NAME)" with BLUE bars
    if (familyData.species.length > 20) {
      const genusData = await getGenusBarChartData(species.genus, trait);
      if (genusData && genusData.species.length > 1) {
        return NextResponse.json({
          ...genusData,
          comparisonType: 'genus',
          taxonomyName: species.genus,
          orderChart: orderData && orderData.species.length > 1 ? {
            species: orderData.species,
            comparisonType: 'order',
            taxonomyName: species.order,
          } : undefined,
        });
      }
      // Fallback: if genus has only 1 species, show genus averages for the family
      const genusAvgData = await getGenusAveragedFamilyData(species.family, trait);
      if (genusAvgData && genusAvgData.species.length > 1) {
        return NextResponse.json({
          ...genusAvgData,
          comparisonType: 'family',
          taxonomyName: species.family,
          orderChart: orderData && orderData.species.length > 1 ? {
            species: orderData.species,
            comparisonType: 'order',
            taxonomyName: species.order,
          } : undefined,
        });
      }
    }

    // <=20 species: show all species in the family
    // → "Family Comparison(FAMILY_NAME)" with RED bars
    return NextResponse.json({
      ...familyData,
      comparisonType: 'family',
      taxonomyName: species.family,
      orderChart: orderData && orderData.species.length > 1 ? {
        species: orderData.species,
        comparisonType: 'order',
        taxonomyName: species.order,
      } : undefined,
    });
  } catch (error) {
    console.error('Error loading family chart data:', error);
    return NextResponse.json(
      { error: 'Failed to load family chart data' },
      { status: 500 }
    );
  }
}
