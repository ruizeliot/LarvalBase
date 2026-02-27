'use strict';

const sharp = require('sharp');
const potrace = require('potrace');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, 'app/public/icons/sections');
const ORIGINALS_DIR = path.join(__dirname, 'eliot-svgs');
const OUTPUT_DIR = path.join(__dirname, 'eliot-svgs-white');
const TEMP_DIR = path.join(__dirname, '.svg-temp');

// Map from target filename to source filename in eliot-svgs/
const FILE_MAP = [
  { target: 'References.svg', source: 'References.svg' },
  { target: 'Settlement.svg', source: 'Settlement.svg' },
  { target: 'Settlement-stage sampling locations.svg', source: 'Settlement-stage_sampling_locations.svg' },
  { target: 'Egg & Incubation.svg', source: 'Egg_Incubation.svg' },
  { target: 'Flexion Stage.svg', source: 'Flexion_Stage.svg' },
  { target: 'Hatching & Pre-flexion Stage.svg', source: 'Hatching_Pre-flexion_Stage.svg' },
  { target: 'Metamorphosis.svg', source: 'Metamorphosis.svg' },
  { target: 'Pelagic Juvenile.svg', source: 'Pelagic_Juvenile.svg' },
  // These don't have originals in eliot-svgs/, use section files as source
  { target: 'Rafting.svg', source: null },
  { target: 'Age-at-Length.svg', source: null },
];

const RENDER_WIDTH = 1200;
const THRESHOLD = 220;
const MORPH_RADIUS = 4;

/**
 * Morphological dilation on a binary buffer (1=foreground, 0=background)
 * @param {Uint8Array} buf - binary pixel buffer
 * @param {number} w - width
 * @param {number} h - height
 * @param {number} radius - dilation radius
 * @returns {Uint8Array} dilated buffer
 */
function dilate(buf, w, h, radius) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let found = false;
      for (let dy = -radius; dy <= radius && !found; dy++) {
        for (let dx = -radius; dx <= radius && !found; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && buf[ny * w + nx] === 1) {
            found = true;
          }
        }
      }
      out[y * w + x] = found ? 1 : 0;
    }
  }
  return out;
}

/**
 * Morphological erosion on a binary buffer
 */
function erode(buf, w, h, radius) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let allSet = true;
      for (let dy = -radius; dy <= radius && allSet; dy++) {
        for (let dx = -radius; dx <= radius && allSet; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h || buf[ny * w + nx] === 0) {
            allSet = false;
          }
        }
      }
      out[y * w + x] = allSet ? 1 : 0;
    }
  }
  return out;
}

/**
 * Flood-fill from all border pixels to identify background.
 * Uses BFS queue. Background = not reached by any ink.
 * @param {Uint8Array} binary - 1=ink, 0=white
 * @param {number} w - width
 * @param {number} h - height
 * @returns {Uint8Array} - 1=fish body (interior), 0=background
 */
function floodFillFromEdges(binary, w, h) {
  const visited = new Uint8Array(w * h); // 0=not visited, 1=visited (background)
  const queue = [];

  // Seed all border pixels that are background (0)
  for (let x = 0; x < w; x++) {
    if (binary[x] === 0 && !visited[x]) { visited[x] = 1; queue.push(x); }
    const bottom = (h - 1) * w + x;
    if (binary[bottom] === 0 && !visited[bottom]) { visited[bottom] = 1; queue.push(bottom); }
  }
  for (let y = 0; y < h; y++) {
    const left = y * w;
    if (binary[left] === 0 && !visited[left]) { visited[left] = 1; queue.push(left); }
    const right = y * w + (w - 1);
    if (binary[right] === 0 && !visited[right]) { visited[right] = 1; queue.push(right); }
  }

  // BFS
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx - x) / w;
    const neighbors = [
      y > 0 ? idx - w : -1,
      y < h - 1 ? idx + w : -1,
      x > 0 ? idx - 1 : -1,
      x < w - 1 ? idx + 1 : -1,
    ];
    for (const nIdx of neighbors) {
      if (nIdx >= 0 && !visited[nIdx] && binary[nIdx] === 0) {
        visited[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }

  // Interior = everything NOT visited by flood fill
  const result = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    result[i] = visited[i] ? 0 : 1;
  }
  return result;
}

/**
 * Convert a binary mask (1=foreground) to a PBM (P4 binary) buffer for potrace
 */
function maskToPBM(mask, w, h) {
  // P4 format: each row is packed bits, padded to byte boundary
  const rowBytes = Math.ceil(w / 8);
  const header = `P4\n${w} ${h}\n`;
  const headerBuf = Buffer.from(header, 'ascii');
  const dataBuf = Buffer.alloc(rowBytes * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 1) {
        const byteIdx = y * rowBytes + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        dataBuf[byteIdx] |= (1 << bitIdx);
      }
    }
  }

  return Buffer.concat([headerBuf, dataBuf]);
}

/**
 * Convert binary mask to a grayscale PNG buffer (black=foreground, white=background)
 * for potrace npm package which expects image buffers
 */
async function maskToPng(mask, w, h) {
  const buf = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) {
    // potrace treats dark pixels as foreground
    buf[i] = mask[i] === 1 ? 0 : 255;
  }
  return sharp(buf, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toBuffer();
}

function traceWithPotrace(pngBuffer) {
  return new Promise((resolve, reject) => {
    const trace = new potrace.Potrace();
    trace.setParameters({
      threshold: 128,
      turdSize: 10,      // remove small noise blobs
      optTolerance: 0.8,  // path optimization tolerance
    });
    trace.loadImage(pngBuffer, (err) => {
      if (err) return reject(err);
      resolve(trace.getSVG());
    });
  });
}

async function processFile(entry) {
  const { target, source } = entry;

  // Determine source SVG path
  let srcPath;
  if (source) {
    srcPath = path.join(ORIGINALS_DIR, source);
    if (!fs.existsSync(srcPath)) {
      console.log(`  ⚠ Original not found: ${source}, falling back to section file`);
      srcPath = path.join(ICONS_DIR, target);
    }
  } else {
    srcPath = path.join(ICONS_DIR, target);
  }

  if (!fs.existsSync(srcPath)) {
    console.log(`  ⚠ Skipping ${target} (source not found)`);
    return;
  }

  const outWhite = path.join(OUTPUT_DIR, target);
  const outSection = path.join(ICONS_DIR, target);

  console.log(`Processing: ${target}`);
  console.log(`  Source: ${srcPath}`);

  // For SVGs with white fills (already processed), create a temp copy with black fills
  let renderPath = srcPath;
  let svgText = fs.readFileSync(srcPath, 'utf-8');
  if (svgText.includes('fill="#FFFFFF"') || svgText.includes("fill='#FFFFFF'")) {
    console.log(`  (inverting white fills to black for rendering)`);
    svgText = svgText.replace(/fill="#FFFFFF"/g, 'fill="#000000"');
    svgText = svgText.replace(/fill='#FFFFFF'/g, "fill='#000000'");
    renderPath = path.join(TEMP_DIR, `${path.basename(target, '.svg')}-inverted.svg`);
    fs.writeFileSync(renderPath, svgText);
  }

  // Step 1: Render SVG to high-res grayscale PNG
  const rendered = await sharp(renderPath, { density: 300 })
    .resize(RENDER_WIDTH, null, { fit: 'inside' })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: pixels, info } = rendered;
  const w = info.width;
  const h = info.height;

  console.log(`  Rendered: ${w}x${h}`);

  // Step 2: Threshold - any pixel darker than THRESHOLD becomes ink (foreground)
  const binary = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    binary[i] = pixels[i] < THRESHOLD ? 1 : 0;
  }

  // Step 3: Morphological close (dilate then erode) to seal gaps
  console.log(`  Morphological close (radius=${MORPH_RADIUS})...`);
  const dilated = dilate(binary, w, h, MORPH_RADIUS);
  const closed = erode(dilated, w, h, MORPH_RADIUS);

  // Step 4: Flood-fill from edges to find background
  console.log(`  Flood-filling from edges...`);
  const interior = floodFillFromEdges(closed, w, h);

  // Count interior pixels for sanity check
  let interiorCount = 0;
  for (let i = 0; i < w * h; i++) if (interior[i]) interiorCount++;
  const pct = ((interiorCount / (w * h)) * 100).toFixed(1);
  console.log(`  Interior: ${interiorCount} pixels (${pct}% of image)`);

  if (interiorCount < 100) {
    console.log(`  ⚠ Very few interior pixels, fish shape might not be enclosed. Skipping.`);
    return;
  }

  // Step 5: Create PNG of the mask for potrace
  const maskPng = await maskToPng(interior, w, h);

  // Save debug image
  const debugPath = path.join(TEMP_DIR, `${path.basename(target, '.svg')}-mask.png`);
  fs.writeFileSync(debugPath, maskPng);

  // Step 6: Trace with potrace
  console.log(`  Tracing with potrace...`);
  let svgContent = await traceWithPotrace(maskPng);

  // Step 7: Post-process SVG - make fill white
  svgContent = svgContent.replace(/fill="#000000"/g, 'fill="#FFFFFF"');
  svgContent = svgContent.replace(/fill="black"/g, 'fill="#FFFFFF"');
  // Remove background rect
  svgContent = svgContent.replace(/<rect[^>]*fill="#ffffff"[^>]*\/>/gi, '');
  svgContent = svgContent.replace(/<rect[^>]*fill="white"[^>]*\/>/gi, '');
  // Ensure nonzero fill-rule
  svgContent = svgContent.replace(/fill-rule="evenodd"/g, 'fill-rule="nonzero"');

  // Write output files
  fs.writeFileSync(outWhite, svgContent);
  fs.writeFileSync(outSection, svgContent);

  const outSize = Buffer.byteLength(svgContent);
  console.log(`  ✓ Output: ${(outSize / 1024).toFixed(1)}KB`);
}

async function main() {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const entry of FILE_MAP) {
    try {
      await processFile(entry);
    } catch (err) {
      console.error(`  ✗ Error processing ${entry.target}: ${err.message}`);
    }
  }

  // Copy Active Behaviors.svg unchanged
  const abSrc = path.join(ICONS_DIR, 'Active Behaviors.svg');
  const abDst = path.join(OUTPUT_DIR, 'Active Behaviors.svg');
  if (fs.existsSync(abSrc)) {
    fs.copyFileSync(abSrc, abDst);
    console.log('Copied Active Behaviors.svg unchanged');
  }

  console.log('\nDone! White silhouettes saved to eliot-svgs-white/ and app/public/icons/sections/');
  console.log('Debug masks saved in .svg-temp/');
}

main().catch(console.error);
