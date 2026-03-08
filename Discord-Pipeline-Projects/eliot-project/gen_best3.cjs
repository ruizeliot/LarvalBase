/**
 * Generate common_names_best3.csv from common_names_marine_fish.csv
 *
 * Scoring algorithm:
 * - Frequency (# occurrences across sources): freq * 3
 * - FishBase source: +8
 * - FAO source: +5
 * - IUCN source: +3
 * - Multi-word names (more descriptive): +3
 * - Names 5-30 chars (sweet spot): +2
 * - Penalize overly generic names: -100 (excluded)
 * - Penalize very short names (<4 chars): -5
 * - Penalize very long names (>40 chars): -3
 * - Capitalize properly
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, 'app', 'data', 'common_names_marine_fish.csv');
const OUTPUT = path.join(__dirname, 'app', 'data', 'common_names_best3.csv');

// Generic names to exclude
const GENERIC_NAMES = new Set([
  'coral fish', 'damsel fish', 'damselfish', 'five finger', 'pilotfish',
  'pilot fish', 'reef fish', 'rock fish', 'rockfish', 'sea fish',
  'coral reef fish', 'marine fish', 'bony fish', 'small fish',
  'fish', 'fishes', 'poisson', 'pez', 'pesce', 'fisch',
]);

// Manual overrides for well-known species
const MANUAL_OVERRIDES = {
  'Gadus morhua': ['Atlantic cod'],
  'Thunnus thynnus': ['Atlantic bluefin tuna'],
  'Hippocampus hippocampus': ['Short-snouted seahorse'],
  'Clupea harengus': ['Atlantic herring'],
  'Salmo salar': ['Atlantic salmon'],
  'Pleuronectes platessa': ['European plaice'],
  'Solea solea': ['Common sole'],
  'Merluccius merluccius': ['European hake'],
  'Scomber scombrus': ['Atlantic mackerel'],
  'Sardina pilchardus': ['European pilchard'],
  'Engraulis encrasicolus': ['European anchovy'],
  'Dicentrarchus labrax': ['European seabass'],
  'Sparus aurata': ['Gilthead seabream'],
  'Amphiprion ocellaris': ['Clown anemonefish'],
  'Amphiprion percula': ['Orange clownfish'],
  'Dascyllus aruanus': ['Whitetail dascyllus'],
  'Epinephelus malabaricus': ['Malabar grouper'],
  'Hippoglossus hippoglossus': ['Atlantic halibut'],
  'Mugil cephalus': ['Flathead grey mullet'],
  'Lates calcarifer': ['Barramundi'],
  'Rachycentron canadum': ['Cobia'],
  'Coryphaena hippurus': ['Common dolphinfish'],
  'Xiphias gladius': ['Swordfish'],
  'Istiophorus platypterus': ['Indo-Pacific sailfish'],
  'Makaira nigricans': ['Atlantic blue marlin'],
  'Mola mola': ['Ocean sunfish'],
  'Diodon hystrix': ['Spot-fin porcupinefish'],
  'Arothron hispidus': ['White-spotted puffer'],
  'Lactoria fornasini': ['Thornback cowfish'],
};

function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const raw = fs.readFileSync(INPUT, 'utf-8');
const lines = raw.split('\n');
const header = lines[0].split('@').map(h => h.replace(/"/g, '').trim());

const validNameIdx = header.indexOf('VALID_NAME');
const commonNameIdx = header.indexOf('COMMON_NAME');
const languageIdx = header.indexOf('LANGUAGE');
const sourceIdx = header.indexOf('SOURCE');

if (validNameIdx < 0 || commonNameIdx < 0 || languageIdx < 0) {
  console.error('Missing columns in CSV');
  process.exit(1);
}

// Collect all English common names per species
const speciesNames = new Map(); // validName -> Map<commonName, { freq, sources }>

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const cols = line.split('@').map(c => c.replace(/"/g, '').trim());
  if (cols.length <= Math.max(validNameIdx, commonNameIdx, languageIdx)) continue;

  const lang = cols[languageIdx];
  if (lang.toLowerCase() !== 'english') continue;

  const validName = cols[validNameIdx];
  const commonName = cols[commonNameIdx]?.trim();
  if (!validName || !commonName) continue;

  const lower = commonName.toLowerCase();
  if (GENERIC_NAMES.has(lower)) continue;
  if (commonName.length < 3) continue;

  if (!speciesNames.has(validName)) {
    speciesNames.set(validName, new Map());
  }
  const nameMap = speciesNames.get(validName);
  const existing = nameMap.get(commonName) || { freq: 0, sources: new Set() };
  existing.freq++;
  if (sourceIdx >= 0 && cols[sourceIdx]) {
    existing.sources.add(cols[sourceIdx].toLowerCase());
  }
  nameMap.set(commonName, existing);
}

// Score and pick best 3 for each species
const output = ['VALID_NAME,LANGUAGE,COMMON_NAME_1,COMMON_NAME_2,COMMON_NAME_3'];

const sortedSpecies = [...speciesNames.keys()].sort();
for (const validName of sortedSpecies) {
  // Check for manual override
  if (MANUAL_OVERRIDES[validName]) {
    const overrides = MANUAL_OVERRIDES[validName];
    const cn1 = overrides[0] || '';
    const cn2 = overrides[1] || '';
    const cn3 = overrides[2] || '';
    output.push(`${validName},English,${cn1},${cn2},${cn3}`);
    continue;
  }

  const nameMap = speciesNames.get(validName);
  const scored = [];

  for (const [name, data] of nameMap) {
    let score = data.freq * 3;

    // Source bonuses
    for (const src of data.sources) {
      if (src.includes('fishbase') || src.includes('fish base')) score += 8;
      if (src.includes('fao')) score += 5;
      if (src.includes('iucn')) score += 3;
      if (src.includes('worms')) score += 2;
    }

    // Multi-word bonus
    const words = name.split(/\s+/).length;
    if (words >= 2) score += 3;

    // Length sweet spot bonus
    if (name.length >= 5 && name.length <= 30) score += 2;

    // Penalties
    if (name.length < 4) score -= 5;
    if (name.length > 40) score -= 3;

    // Capitalize first letter
    const displayName = capitalize(name);

    scored.push({ name: displayName, score });
  }

  // Sort by score desc, then alphabetically
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  // Deduplicate case-insensitively
  const seen = new Set();
  const unique = [];
  for (const s of scored) {
    const lower = s.name.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    unique.push(s);
    if (unique.length >= 3) break;
  }

  const cn1 = unique[0]?.name || '';
  const cn2 = unique[1]?.name || '';
  const cn3 = unique[2]?.name || '';

  if (cn1) {
    output.push(`${validName},English,${cn1},${cn2},${cn3}`);
  }
}

fs.writeFileSync(OUTPUT, output.join('\n') + '\n', 'utf-8');
console.log(`Generated ${OUTPUT} with ${output.length - 1} species`);
