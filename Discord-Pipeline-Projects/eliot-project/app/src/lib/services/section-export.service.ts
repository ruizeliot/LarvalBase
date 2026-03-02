/**
 * Section export service.
 *
 * Provides data for section-level CSV exports at Species, Genus, or Family level.
 * Each row includes standard taxonomy columns + all original CSV trait columns.
 */

import { getOrLoadData } from '@/lib/data/data-repository';

/**
 * Get export data for a section at a given taxonomy level.
 *
 * @param speciesId - The current species ID (used to determine genus/family)
 * @param traitKeys - Trait types belonging to this section
 * @param level - Taxonomy level: species (just this species), genus, or family
 * @returns Array of row objects with taxonomy + trait columns, or null if species not found
 */
export async function getSectionExportData(
  speciesId: string,
  traitKeys: string[],
  level: 'species' | 'genus' | 'family'
): Promise<Array<Record<string, unknown>> | null> {
  const data = await getOrLoadData();

  // Find the current species
  const species = data.species.get(speciesId);
  if (!species) {
    return null;
  }

  // Determine which species IDs to include based on taxonomy level
  const targetSpeciesIds: string[] = [];

  if (level === 'species') {
    targetSpeciesIds.push(speciesId);
  } else {
    // Find all species in same genus or family
    for (const [id, sp] of data.species) {
      if (level === 'genus' && sp.genus === species.genus) {
        targetSpeciesIds.push(id);
      } else if (level === 'family' && sp.family === species.family) {
        targetSpeciesIds.push(id);
      }
    }
  }

  // Collect raw rows from trait data
  const rows: Array<Record<string, unknown>> = [];

  for (const sid of targetSpeciesIds) {
    const sp = data.species.get(sid);
    const traits = data.traitsBySpecies.get(sid) || [];

    // Filter to only the section's traits
    const sectionTraits = traits.filter((t) => traitKeys.includes(t.traitType));

    for (const trait of sectionTraits) {
      // Use rawFields if available (full original CSV row)
      if (trait.metadata?.rawFields) {
        const rawRow = { ...trait.metadata.rawFields };
        // Remove internal/unwanted columns
        delete rawRow.ROW_INDEX;
        delete rawRow.LINK;
        // Ensure standard taxonomy columns are present
        if (!rawRow.ORDER && sp) rawRow.ORDER = sp.order;
        if (!rawRow.FAMILY && sp) rawRow.FAMILY = sp.family;
        if (!rawRow.GENUS && sp) rawRow.GENUS = sp.genus;
        if (!rawRow.VALID_NAME && sp) rawRow.VALID_NAME = sp.validName;
        rows.push(rawRow);
      } else {
        // Fallback: construct row from trait data
        rows.push({
          ORDER: sp?.order || '',
          FAMILY: sp?.family || '',
          GENUS: sp?.genus || '',
          VALID_NAME: sp?.validName || '',
          TRAIT_TYPE: trait.traitType,
          VALUE: trait.value,
          UNIT: trait.unit,
          REFERENCE: trait.source || '',
          LINK: trait.doi || '',
        });
      }
    }
  }

  return rows;
}
