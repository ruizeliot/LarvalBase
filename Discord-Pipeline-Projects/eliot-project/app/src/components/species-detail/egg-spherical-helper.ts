import type { EggQualitativeData } from './egg-qualitative-panel';

/**
 * Determine if all eggs are spherical for a species.
 *
 * Returns true only when:
 * 1. EGG_SHAPE frequency data exists and ALL entries are "spherical" (case-insensitive)
 * 2. No egg_width data exists that differs from egg_diameter (hasEggWidthData=false)
 *
 * When true, the UI shows a single "Egg Diameter" panel instead of separate
 * "Egg Length" + "Egg Width" panels.
 */
export function isAllEggsSpherical(
  eggQualitativeData: EggQualitativeData | null,
  hasEggWidthData: boolean,
): boolean {
  if (!eggQualitativeData) return false;

  // If egg_width data exists (EGG_W_MEAN differs from EGG_L_MEAN for some row),
  // then they're not all spherical in practice
  if (hasEggWidthData) return false;

  const shapeEntries = eggQualitativeData.traits?.EGG_SHAPE;
  if (!shapeEntries || !Array.isArray(shapeEntries) || shapeEntries.length === 0) return false;

  return shapeEntries.every((e) => e.value.toLowerCase() === 'spherical');
}
