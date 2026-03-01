'use strict';

const sharp = require('sharp');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, 'eliot-svgs-redo', 'input.svg');
const OUTPUT = path.join(__dirname, 'eliot-svgs-redo', 'output.svg');
const TEMP = path.join(__dirname, '.svg-redo-temp');

/**
 * Flood fill from all border white pixels to mark exterior.
 * Returns Uint8Array: 1 = exterior, 0 = interior or black.
 */
function floodFillExterior(bw, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height * 2);
  let head = 0, tail = 0;

  function enqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    if (bw[idx] === 0) return; // black = boundary
    visited[idx] = 1;
    queue[tail++] = x;
    queue[tail++] = y;
  }

  // Seed from all 4 edges
  for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y++) { enqueue(0, y); enqueue(width - 1, y); }

  while (head < tail) {
    const x = queue[head++];
    const y = queue[head++];
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }
  return visited;
}

/**
 * Morphological dilate (3x3 square kernel, repeated `iterations` times).
 * black=0, white=255. Dilate expands black regions.
 */
function dilate(bw, w, h, iterations) {
  let src = bw;
  for (let iter = 0; iter < iterations; iter++) {
    const dst = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (src[idx] === 0) { dst[idx] = 0; continue; }
        // If any neighbor is black, this pixel becomes black
        let isBlack = false;
        for (let dy = -1; dy <= 1 && !isBlack; dy++) {
          for (let dx = -1; dx <= 1 && !isBlack; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && src[ny * w + nx] === 0) {
              isBlack = true;
            }
          }
        }
        dst[idx] = isBlack ? 0 : 255;
      }
    }
    src = dst;
  }
  return src;
}

/**
 * Morphological erode (3x3 square kernel, repeated `iterations` times).
 * Erode shrinks black regions.
 */
function erode(bw, w, h, iterations) {
  let src = bw;
  for (let iter = 0; iter < iterations; iter++) {
    const dst = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (src[idx] === 255) { dst[idx] = 255; continue; }
        // If any neighbor is white, this pixel becomes white
        let isWhite = false;
        for (let dy = -1; dy <= 1 && !isWhite; dy++) {
          for (let dx = -1; dx <= 1 && !isWhite; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && src[ny * w + nx] === 255) {
              isWhite = true;
            }
          }
        }
        dst[idx] = isWhite ? 255 : 0;
      }
    }
    src = dst;
  }
  return src;
}

async function main() {
  fs.mkdirSync(TEMP, { recursive: true });

  // Step 1: Render input SVG at very high resolution with thick stroke
  const svgContent = fs.readFileSync(INPUT, 'utf-8');

  // Parse original dimensions
  const wMatch = svgContent.match(/width="(\d+)"/);
  const hMatch = svgContent.match(/height="(\d+)"/);
  const origW = wMatch ? parseInt(wMatch[1]) : 800;
  const origH = hMatch ? parseInt(hMatch[1]) : 471;

  // Add thick stroke + padding to bridge gaps in the line art
  const strokeWidth = Math.round(origW * 0.02);
  const pad = 60;
  const padW = origW + pad * 2;
  const padH = origH + pad * 2;

  const modifiedSvg = svgContent
    .replace(/width="\d+"/, `width="${padW}"`)
    .replace(/height="\d+"/, `height="${padH}"`)
    .replace(/<svg([^>]*)>/, `<svg$1 viewBox="-${pad} -${pad} ${padW} ${padH}">`)
    .replace(/stroke="none"/g, `stroke="#000000" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"`);

  const RENDER_W = 2400;
  const renderPath = path.join(TEMP, 'render.png');

  await sharp(Buffer.from(modifiedSvg), { density: 300 })
    .resize(RENDER_W, null, { fit: 'inside' })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .greyscale()
    .threshold(128)
    .png()
    .toFile(renderPath);

  const meta = await sharp(renderPath).metadata();
  const w = meta.width, h = meta.height;
  console.log(`Rendered: ${w}x${h}`);

  // Step 2: Get raw pixel data
  const { data: rawData, info: rawInfo } = await sharp(renderPath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = rawInfo.channels;
  const bw = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    bw[i] = rawData[i * channels] > 128 ? 255 : 0;
  }

  // Step 3: Flood fill from all edges to mark exterior
  const exterior = floodFillExterior(bw, w, h);

  // Step 4: Create silhouette — everything NOT exterior = black
  const silhouette = new Uint8Array(w * h);
  let filled = 0;
  for (let i = 0; i < w * h; i++) {
    if (exterior[i]) {
      silhouette[i] = 255; // exterior = white
    } else {
      silhouette[i] = 0;   // interior = black
      filled++;
    }
  }
  console.log(`Flood fill: ${filled} pixels filled (${(filled / (w * h) * 100).toFixed(1)}%)`);

  // Step 5: Morphological CLOSE (dilate then erode) to fill small gaps
  const closeRadius = 5;
  console.log(`Morphological close: radius=${closeRadius}`);
  let closed = dilate(silhouette, w, h, closeRadius);
  closed = erode(closed, w, h, closeRadius);

  // Step 6: Save filled silhouette
  const filledPath = path.join(TEMP, 'filled.png');
  await sharp(Buffer.from(closed), { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toFile(filledPath);

  // Step 7: Crop padding
  const scale = w / padW;
  const padPx = Math.round(pad * scale);
  const cropW = w - padPx * 2;
  const cropH = h - padPx * 2;

  const croppedPath = path.join(TEMP, 'cropped.png');
  await sharp(filledPath)
    .extract({ left: padPx, top: padPx, width: cropW, height: cropH })
    .png()
    .toFile(croppedPath);

  console.log(`Cropped: ${cropW}x${cropH}`);

  // Step 8: Trace with potrace
  const bmpPath = path.join(TEMP, 'cropped.bmp');
  await sharp(croppedPath)
    .toColourspace('b-w')
    .toFile(bmpPath);

  // Try potrace first, fall back to vtracer
  let tracedSvg;
  try {
    execSync(`potrace "${bmpPath}" -s -o "${path.join(TEMP, 'traced.svg')}" --flat --turdsize 10`, { stdio: 'pipe' });
    tracedSvg = fs.readFileSync(path.join(TEMP, 'traced.svg'), 'utf-8');
    console.log('Traced with potrace');
  } catch {
    console.log('potrace not found, using vtracer');
    execSync([
      'vtracer',
      '--input', `"${croppedPath}"`,
      '--output', `"${path.join(TEMP, 'traced.svg')}"`,
      '--colormode', 'bw',
      '--filter_speckle', '8',
      '--corner_threshold', '25',
      '--segment_length', '3.5',
      '--splice_threshold', '45',
      '--path_precision', '3',
      '--mode', 'polygon',
    ].join(' '), { stdio: 'pipe' });
    tracedSvg = fs.readFileSync(path.join(TEMP, 'traced.svg'), 'utf-8');
    console.log('Traced with vtracer');
  }

  // Step 9: Extract black paths and build clean SVG
  // Handle both potrace and vtracer output
  const blackPaths = [];

  // potrace style: <path d="..." fill="#000000"/>
  const regex1 = /<path d="([^"]+)"[^>]*fill="#000000"/g;
  let match;
  while ((match = regex1.exec(tracedSvg)) !== null) {
    blackPaths.push(match[1]);
  }

  // potrace also outputs paths with just fill="black"
  const regex2 = /<path d="([^"]+)"[^>]*fill="black"/g;
  while ((match = regex2.exec(tracedSvg)) !== null) {
    blackPaths.push(match[1]);
  }

  // potrace default: paths without explicit fill (default is black)
  if (blackPaths.length === 0) {
    const regex3 = /<path d="([^"]+)"/g;
    while ((match = regex3.exec(tracedSvg)) !== null) {
      // Only include if no fill="white" or fill="#ffffff"
      const fullMatch = tracedSvg.substring(match.index, tracedSvg.indexOf('/>', match.index) + 2);
      if (!fullMatch.includes('fill="#ffffff"') && !fullMatch.includes('fill="white"')) {
        blackPaths.push(match[1]);
      }
    }
  }

  if (blackPaths.length === 0) {
    console.error('No paths found! Saving raw traced SVG as output.');
    fs.copyFileSync(path.join(TEMP, 'traced.svg'), OUTPUT);
    return;
  }

  console.log(`Found ${blackPaths.length} black path(s)`);

  // Build output SVG with original viewBox dimensions
  const allPathData = blackPaths.join(' ');

  // Compute bounding box of all path coordinates
  const coordRegex = /(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/g;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let cm;
  while ((cm = coordRegex.exec(allPathData)) !== null) {
    const x = parseFloat(cm[1]), y = parseFloat(cm[2]);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const pathW = maxX - minX;
  const pathH = maxY - minY;
  console.log(`Path bbox: (${minX},${minY}) to (${maxX},${maxY}) = ${Math.round(pathW)}x${Math.round(pathH)}`);

  // Use the path's native coordinate system as the viewBox, scale to match origW x origH display
  const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${pathW} ${pathH}" width="${origW}" height="${origH}">
    <path d="${allPathData}" stroke="none" fill="black" fill-rule="nonzero"/>
</svg>`;

  fs.writeFileSync(OUTPUT, cleanSvg);
  console.log(`Output: ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)}KB`);

  // Generate preview
  await sharp(Buffer.from(cleanSvg), { density: 150 })
    .resize(800, null, { fit: 'inside' })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toFile(path.join(__dirname, 'eliot-svgs-redo', 'output-preview.png'));

  console.log('Done!');
}

main().catch(console.error);
