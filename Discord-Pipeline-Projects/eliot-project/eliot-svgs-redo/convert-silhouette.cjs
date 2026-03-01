'use strict';

const sharp = require('sharp');
const potrace = require('potrace');
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, 'input.svg');
const OUTPUT = path.join(__dirname, 'output.svg');

async function main() {
  console.log('Reading input SVG...');
  const svgBuffer = fs.readFileSync(INPUT);

  // Step 1: Render SVG to high-res PNG (3x scale for 2400px wide)
  const RENDER_WIDTH = 2400;
  console.log(`Rendering SVG at ${RENDER_WIDTH}px wide...`);

  const rawPng = await sharp(svgBuffer, { density: 300 })
    .resize(RENDER_WIDTH)
    .flatten({ background: '#ffffff' }) // white background
    .png()
    .toBuffer();

  // Step 2: Flood-fill approach — render, find background, invert to get solid fish
  console.log('Processing: flood-fill based silhouette extraction...');

  // First get the image metadata
  const metadata = await sharp(rawPng).metadata();
  const imgWidth = metadata.width;
  const imgHeight = metadata.height;

  // Get raw pixel data (grayscale)
  const grayBuf = await sharp(rawPng)
    .grayscale()
    .raw()
    .toBuffer();

  // Threshold to B&W (0 = black/fish, 255 = white/background)
  const bw = Buffer.alloc(imgWidth * imgHeight);
  for (let i = 0; i < grayBuf.length; i++) {
    bw[i] = grayBuf[i] > 128 ? 255 : 0;
  }

  // Flood-fill from all edges to mark background pixels
  // This correctly identifies the fish silhouette even with internal white gaps
  const visited = new Uint8Array(imgWidth * imgHeight);
  const queue = [];

  // Seed from all 4 edges
  for (let x = 0; x < imgWidth; x++) {
    if (bw[x] === 255) queue.push(x); // top row
    const bottomIdx = (imgHeight - 1) * imgWidth + x;
    if (bw[bottomIdx] === 255) queue.push(bottomIdx);
  }
  for (let y = 0; y < imgHeight; y++) {
    const leftIdx = y * imgWidth;
    if (bw[leftIdx] === 255) queue.push(leftIdx); // left col
    const rightIdx = y * imgWidth + (imgWidth - 1);
    if (bw[rightIdx] === 255) queue.push(rightIdx);
  }

  // Mark all seeds as visited
  for (const idx of queue) {
    visited[idx] = 1;
  }

  // BFS flood fill (4-connected)
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % imgWidth;
    const y = Math.floor(idx / imgWidth);

    const neighbors = [];
    if (x > 0) neighbors.push(idx - 1);
    if (x < imgWidth - 1) neighbors.push(idx + 1);
    if (y > 0) neighbors.push(idx - imgWidth);
    if (y < imgHeight - 1) neighbors.push(idx + imgWidth);

    for (const n of neighbors) {
      if (!visited[n] && bw[n] === 255) {
        visited[n] = 1;
        queue.push(n);
      }
    }
  }

  console.log(`Flood fill: ${queue.length} background pixels identified`);

  // Create silhouette: anything NOT reached by flood fill = fish (black)
  // Anything reached = background (white)
  const silhouette = Buffer.alloc(imgWidth * imgHeight);
  for (let i = 0; i < silhouette.length; i++) {
    silhouette[i] = visited[i] ? 255 : 0; // background=white, fish=black
  }

  // Apply light morphological close to smooth the edges
  // Dilate (blur + low threshold) then erode (blur + high threshold)
  const silPng = await sharp(silhouette, { raw: { width: imgWidth, height: imgHeight, channels: 1 } })
    .png()
    .toBuffer();

  const dilated = await sharp(silPng)
    .blur(1.5)
    .threshold(200)   // aggressive = more black = dilation
    .png()
    .toBuffer();

  const closed = await sharp(dilated)
    .blur(1.5)
    .threshold(80)    // pull back = erosion
    .png()
    .toBuffer();

  // Step 3: Save intermediate for potrace
  const tempPng = path.join(__dirname, '_temp_silhouette.png');
  fs.writeFileSync(tempPng, closed);

  console.log('Saved intermediate PNG for tracing.');

  // Step 4: Trace with potrace at high quality
  console.log('Tracing with potrace...');

  await new Promise((resolve, reject) => {
    potrace.trace(tempPng, {
      turdSize: 2,         // remove small speckles (tiny noise)
      alphaMax: 0.8,       // smoother corners (0=sharp, 1.334=very smooth)
      optCurve: true,      // optimize curves
      optTolerance: 0.2,   // curve optimization tolerance (lower=more precise)
      threshold: 128,      // B&W threshold
      color: '#000000',
      background: 'transparent',
    }, (err, svg) => {
      if (err) return reject(err);

      // Step 5: Parse and reformat SVG to match reference style
      // Extract viewBox dimensions and path data
      const widthMatch = svg.match(/width="(\d+)"/);
      const heightMatch = svg.match(/height="(\d+)"/);
      const pathMatch = svg.match(/<path[^>]*d="([^"]+)"/);

      if (!pathMatch) {
        return reject(new Error('No path found in potrace output'));
      }

      const w = widthMatch ? widthMatch[1] : RENDER_WIDTH;
      const h = heightMatch ? heightMatch[1] : '1000';
      const pathData = pathMatch[1];

      // Scale path back to original 800px width
      const ORIGINAL_WIDTH = 800;
      const scale = ORIGINAL_WIDTH / parseInt(w);
      const scaledH = Math.round(parseInt(h) * scale);

      // Build clean SVG matching reference format
      const outputSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ORIGINAL_WIDTH} ${scaledH}" width="${ORIGINAL_WIDTH}" height="${scaledH}">
  <g transform="scale(${scale.toFixed(6)}, ${scale.toFixed(6)})">
    <path d="${pathData}" stroke="none" fill="black" fill-rule="evenodd"/>
  </g>
</svg>`;

      fs.writeFileSync(OUTPUT, outputSvg);
      console.log(`Output written to ${OUTPUT}`);
      console.log(`Dimensions: ${ORIGINAL_WIDTH}x${scaledH} (scaled from ${w}x${h})`);

      // Cleanup temp files
      try { fs.unlinkSync(tempPng); } catch(e) {}

      resolve();
    });
  });
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
