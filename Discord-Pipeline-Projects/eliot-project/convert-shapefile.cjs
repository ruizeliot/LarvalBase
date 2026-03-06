/**
 * Convert Spalding provinces shapefile to simplified GeoJSON.
 * Extracts only PROVINCE-level polygons (where ECOREGION is null/empty).
 * Uses TopoJSON simplification to reduce file size.
 */
const shapefile = require('shapefile');
const topojson = require('topojson-server');
const topoSimplify = require('topojson-simplify');
const topoClient = require('topojson-client');
const fs = require('fs');
const path = require('path');

const shpPath = path.join(
  __dirname,
  'reference-data/spalding-provinces-valid/Spalding provinces valid/WCMC-036-MEOW-PPOW-2007-2012-NoCoast_valid.shp'
);
const outPath = path.join(__dirname, 'app/data/spalding_provinces.geojson');

async function convert() {
  const source = await shapefile.open(shpPath);
  const features = [];

  let total = 0;
  let provinces = 0;

  while (true) {
    const result = await source.read();
    if (result.done) break;
    total++;

    const props = result.value.properties;
    const ecoregion = props.ECOREGION;
    if (ecoregion && ecoregion.trim() !== '') continue;

    provinces++;
    features.push({
      type: 'Feature',
      properties: {
        PROVINCE: props.PROVINCE,
        REALM: props.REALM,
      },
      geometry: result.value.geometry,
    });
  }

  console.log(`Total features: ${total}, Province-level: ${provinces}`);

  // Convert to topology, simplify, then back to GeoJSON
  const geojson = { type: 'FeatureCollection', features };
  const topology = topojson.topology({ provinces: geojson });

  // Presimplify and simplify with a weight threshold
  const presimplified = topoSimplify.presimplify(topology);
  // Use a quantile-based threshold — keep ~2% of points
  const minWeight = topoSimplify.quantile(presimplified, 0.02);
  const simplified = topoSimplify.simplify(presimplified, minWeight);

  // Convert back to GeoJSON
  const simplifiedGeoJSON = topoClient.feature(simplified, simplified.objects.provinces);

  // Round coordinates to 3 decimal places (~100m precision) to further reduce size
  const str = JSON.stringify(simplifiedGeoJSON, (key, val) => {
    if (typeof val === 'number') {
      return Math.round(val * 1000) / 1000;
    }
    return val;
  });

  fs.writeFileSync(outPath, str);
  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`Written to ${outPath} (${sizeMB} MB)`);
  console.log(`Features: ${simplifiedGeoJSON.features.length}`);
}

convert().catch(console.error);
