import { NextResponse } from 'next/server';
import { getOrLoadData } from '@/lib/data/data-repository';
import { loadImageRegistry } from '@/lib/data/image-registry';

/**
 * GET /api/homepage-stats/families
 *
 * Returns family photo grid data: one entry per family, sorted by order.
 * Each entry includes the family name, order, species list with record counts,
 * and a representative image URL (preferring certain blackwater images).
 */
export async function GET() {
  try {
    const [data, imageRegistry] = await Promise.all([
      getOrLoadData(),
      loadImageRegistry(),
    ]);

    // Build family -> best image map and image count from image registry
    // Priority: certain blackwater > certain any > uncertain any
    const familyImageMap = new Map<string, string>();
    const familyImageCount = new Map<string, number>();
    for (const images of imageRegistry.imagesBySpecies.values()) {
      for (const img of images) {
        if (!img.family) continue;
        // Count all images per family
        familyImageCount.set(img.family, (familyImageCount.get(img.family) ?? 0) + 1);

        const existing = familyImageMap.get(img.family);
        // Build URL for this image
        const imageUrl = `/api/images/${encodeURIComponent(img.path)}/${encodeURIComponent(img.filename)}`;

        if (!existing) {
          // No image yet for this family — use this one
          familyImageMap.set(img.family, imageUrl);
        } else if (!img.uncertain && img.author === 'Blackwater') {
          // Certain blackwater image — always preferred
          familyImageMap.set(img.family, imageUrl);
          break; // Found best possible for this species, but continue loop for other families
        }
      }
    }

    // Second pass: prefer certain blackwater images specifically
    for (const images of imageRegistry.imagesBySpecies.values()) {
      for (const img of images) {
        if (!img.family || img.uncertain || img.author !== 'Blackwater') continue;
        // Overwrite with certain blackwater if available
        familyImageMap.set(img.family, `/api/images/${encodeURIComponent(img.path)}/${encodeURIComponent(img.filename)}`);
        break; // One per species is enough
      }
    }

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

    // Sort families by most images first (left→right, top→bottom)
    const familiesWithImages = Array.from(familyMap.values())
      .filter((f) => familyImageMap.has(f.family));

    const families = familiesWithImages
      .sort((a, b) => {
        const aCount = familyImageCount.get(a.family) ?? 0;
        const bCount = familyImageCount.get(b.family) ?? 0;
        // Most images first, then alphabetical family name
        return (bCount - aCount) || a.family.localeCompare(b.family);
      })
      .map((f) => ({
        ...f,
        imageUrl: familyImageMap.get(f.family)!,
        imageCount: familyImageCount.get(f.family) ?? 0,
        hasFamilyIcon: imageRegistry.familiesWithIcons.has(f.family),
      }));

    return NextResponse.json(
      { families },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (error) {
    console.error('Error loading family data:', error);
    return NextResponse.json(
      { error: 'Failed to load family data' },
      { status: 500 }
    );
  }
}
