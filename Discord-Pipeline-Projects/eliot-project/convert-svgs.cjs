'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Potrace } = require('potrace');

const INPUT_DIR = path.join(__dirname, 'eliot-svgs-to-fill', 'input_svgs');
const OUTPUT_DIR = path.join(__dirname, 'eliot-svgs-filled');
const DEBUG_DIR = path.join(__dirname, 'eliot-svgs-filled', 'debug');

const RENDER_WIDTH = 1200;
const PAD = 60;
const BORDER_CLEAR = 6;
const DILATE_RADIUS = 16;  // large to bridge fin ray gaps and body outline gaps
const ERODE_RADIUS = 14;   // erode back most of the dilation
const DEBUG = process.argv.includes('--debug');

function getFiles() {
  return fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.svg'));
}

/**
 * Dilate binary image using horizontal then vertical pass (separable, much faster).
 * Expands black pixels by radius.
 */
function dilate1D(data, w, h, radius) {
  // Horizontal pass
  const hPass = Buffer.alloc(w * h, 255);
  for (let y = 0; y < h; y++) {
    let count = 0; // running count of black pixels in window
    // Initialize window [0, radius]
    for (let x = 0; x <= radius && x < w; x++) {
      if (data[y * w + x] === 0) count++;
    }
    if (count > 0) hPass[y * w] = 0;

    for (let x = 1; x < w; x++) {
      // Add pixel entering window (x + radius)
      const addX = x + radius;
      if (addX < w && data[y * w + addX] === 0) count++;
      // Remove pixel leaving window (x - radius - 1)
      const remX = x - radius - 1;
      if (remX >= 0 && data[y * w + remX] === 0) count--;
      if (count > 0) hPass[y * w + x] = 0;
    }
  }

  // Vertical pass
  const result = Buffer.alloc(w * h, 255);
  for (let x = 0; x < w; x++) {
    let count = 0;
    for (let y = 0; y <= radius && y < h; y++) {
      if (hPass[y * w + x] === 0) count++;
    }
    if (count > 0) result[x] = 0;

    for (let y = 1; y < h; y++) {
      const addY = y + radius;
      if (addY < h && hPass[addY * w + x] === 0) count++;
      const remY = y - radius - 1;
      if (remY >= 0 && hPass[remY * w + x] === 0) count--;
      if (count > 0) result[y * w + x] = 0;
    }
  }
  return result;
}

/**
 * Erode binary image using horizontal then vertical pass.
 * Shrinks black pixels by radius.
 */
function erode1D(data, w, h, radius) {
  // Horizontal pass: pixel stays black only if entire horizontal window is black
  const hPass = Buffer.alloc(w * h, 0);
  for (let y = 0; y < h; y++) {
    let whiteCount = 0;
    for (let x = 0; x <= radius && x < w; x++) {
      if (data[y * w + x] === 255) whiteCount++;
    }
    // For x=0: check window [-radius, radius]
    // Left side is clamped to 0, count whites in [0, radius]
    // But we also need to account for missing left pixels - treat as white (border)
    let leftMissing = radius; // pixels to the left of x=0 that don't exist
    if (whiteCount + leftMissing > 0) hPass[y * w] = 255;

    for (let x = 1; x < w; x++) {
      leftMissing = Math.max(0, radius - x);
      const addX = x + radius;
      if (addX < w && data[y * w + addX] === 255) whiteCount++;
      else if (addX >= w) whiteCount++; // treat out-of-bounds as white
      const remX = x - radius - 1;
      if (remX >= 0 && data[y * w + remX] === 255) whiteCount--;
      else if (remX < 0) {} // was treated as part of leftMissing before
      if (whiteCount + leftMissing > 0) hPass[y * w + x] = 255;
    }
  }

  // Vertical pass
  const result = Buffer.alloc(w * h, 0);
  for (let x = 0; x < w; x++) {
    let whiteCount = 0;
    for (let y = 0; y <= radius && y < h; y++) {
      if (hPass[y * w + x] === 255) whiteCount++;
    }
    let topMissing = radius;
    if (whiteCount + topMissing > 0) result[x] = 255;

    for (let y = 1; y < h; y++) {
      topMissing = Math.max(0, radius - y);
      const addY = y + radius;
      if (addY < h && hPass[addY * w + x] === 255) whiteCount++;
      else if (addY >= h) whiteCount++;
      const remY = y - radius - 1;
      if (remY >= 0 && hPass[remY * w + x] === 255) whiteCount--;
      if (whiteCount + topMissing > 0) result[y * w + x] = 255;
    }
  }
  return result;
}

function floodFillBackground(data, w, h) {
  const visited = new Uint8Array(w * h);
  const queue = [];

  for (let x = 0; x < w; x++) {
    if (data[x] === 255 && !visited[x]) { visited[x] = 1; queue.push(x); }
    const bi = (h - 1) * w + x;
    if (data[bi] === 255 && !visited[bi]) { visited[bi] = 1; queue.push(bi); }
  }
  for (let y = 0; y < h; y++) {
    const li = y * w;
    if (data[li] === 255 && !visited[li]) { visited[li] = 1; queue.push(li); }
    const ri = y * w + w - 1;
    if (data[ri] === 255 && !visited[ri]) { visited[ri] = 1; queue.push(ri); }
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % w, y = (idx - x) / w;
    const neighbors = [
      y > 0 ? idx - w : -1,
      y < h - 1 ? idx + w : -1,
      x > 0 ? idx - 1 : -1,
      x < w - 1 ? idx + 1 : -1,
    ];
    for (const ni of neighbors) {
      if (ni >= 0 && !visited[ni] && data[ni] === 255) {
        visited[ni] = 1;
        queue.push(ni);
      }
    }
  }

  const result = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) {
    result[i] = visited[i] ? 255 : 0;
  }
  return result;
}

async function saveDebugPng(data, w, h, filename) {
  if (!DEBUG) return;
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
  await sharp(data, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toFile(path.join(DEBUG_DIR, filename));
}

/**
 * Run the morphological close + flood fill pipeline with given radii.
 * Returns { cropped, fillRatio } where cropped is the binary silhouette bitmap.
 */
function processWithRadii(binary, rw, rh, dilateR, erodeR) {
  // Add white padding
  const pw = rw + PAD * 2, ph = rh + PAD * 2;
  const padded = Buffer.alloc(pw * ph, 255);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      padded[(y + PAD) * pw + (x + PAD)] = binary[y * rw + x];
    }
  }

  // Morphological close: dilate then erode
  const dilated = dilate1D(padded, pw, ph, dilateR);
  const closed = erode1D(dilated, pw, ph, erodeR);

  // Flood fill from edges
  const filled = floodFillBackground(closed, pw, ph);

  // Remove padding
  const cropped = Buffer.alloc(rw * rh);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      cropped[y * rw + x] = filled[(y + PAD) * pw + (x + PAD)];
    }
  }

  let blackCount = 0;
  for (let i = 0; i < rw * rh; i++) {
    if (cropped[i] === 0) blackCount++;
  }
  const fillRatio = blackCount / (rw * rh);
  return { cropped, fillRatio };
}

async function processSvg(filename) {
  const svgPath = path.join(INPUT_DIR, filename);
  const svgBuf = fs.readFileSync(svgPath);
  const svgStr = svgBuf.toString('utf8');

  const wMatch = svgStr.match(/width="(\d+)"/);
  const hMatch = svgStr.match(/height="(\d+)"/);
  const origW = wMatch ? parseInt(wMatch[1]) : 800;
  const origH = hMatch ? parseInt(hMatch[1]) : 400;

  const renderH = Math.round(RENDER_WIDTH * origH / origW);
  const baseName = path.basename(filename, '.svg');

  // 1. Render SVG with white background
  const { data: rawData, info } = await sharp(svgBuf, { density: 150 })
    .flatten({ background: '#ffffff' })
    .resize(RENDER_WIDTH, renderH, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rw = info.width, rh = info.height;

  // 2. Threshold to binary
  const binary = Buffer.alloc(rw * rh);
  for (let i = 0; i < rw * rh; i++) {
    binary[i] = rawData[i] < 128 ? 0 : 255;
  }

  // 3. Clear border region
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      if (y < BORDER_CLEAR || y >= rh - BORDER_CLEAR ||
          x < BORDER_CLEAR || x >= rw - BORDER_CLEAR) {
        binary[y * rw + x] = 255;
      }
    }
  }

  await saveDebugPng(binary, rw, rh, `${baseName}_1_binary.png`);

  // 4. Try with standard radii first
  let { cropped, fillRatio } = processWithRadii(binary, rw, rh, DILATE_RADIUS, ERODE_RADIUS);

  // 5. If fill ratio is too low, retry with progressively larger radii
  const retryRadii = [
    { d: 18, e: 16 },
    { d: 26, e: 24 },
    { d: 34, e: 32 },
  ];
  for (const { d, e } of retryRadii) {
    if (fillRatio >= 0.15) break; // good enough
    console.log(`    Retrying ${filename} with dilate=${d}, erode=${e}`);
    ({ cropped, fillRatio } = processWithRadii(binary, rw, rh, d, e));
  }

  if (fillRatio > 0.85 || fillRatio < 0.05) {
    console.warn(`  WARNING: ${filename} fill ratio ${(fillRatio*100).toFixed(1)}%`);
  }

  await saveDebugPng(cropped, rw, rh, `${baseName}_5_final.png`);

  // 8. Create PNG for potrace
  const pngBuffer = await sharp(cropped, { raw: { width: rw, height: rh, channels: 1 } })
    .png()
    .toBuffer();

  // 9. Trace with potrace
  return new Promise((resolve, reject) => {
    const tracer = new Potrace();
    tracer.setParameters({
      turdSize: 100,
      optTolerance: 0.4,
      threshold: 128,
    });
    tracer.loadImage(pngBuffer, (err) => {
      if (err) return reject(err);

      const pathTag = tracer.getPathTag();

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${origW} ${origH}" width="${origW}" height="${origH}">
  <g transform="scale(${origW / rw}, ${origH / rh})">
    ${pathTag}
  </g>
</svg>`;

      const outPath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(outPath, svg);
      resolve({ path: outPath, fillRatio });
    });
  });
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = getFiles();
  console.log(`Found ${files.length} SVGs to convert`);

  let success = 0, fail = 0;
  for (const file of files) {
    try {
      const result = await processSvg(file);
      success++;
      console.log(`[${success}/${files.length}] ✓ ${file} (fill: ${(result.fillRatio*100).toFixed(1)}%)`);
    } catch (err) {
      fail++;
      console.error(`[FAIL] ${file}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${success} success, ${fail} failed out of ${files.length}`);
}

main().catch(console.error);
