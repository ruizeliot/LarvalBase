#!/usr/bin/env node
'use strict';

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// CRITICAL: Source is the CLEAN extracted ZIP — never write to it
const SOURCE_DIR = '/var/www/eliot/images-clean';
// Output goes to a NEW directory — never overwrite source
const OUTPUT_DIR = '/var/www/eliot/images-watermarked';

const METADATA_FILES = [
  'sp_ids_pics_metadata_03_2026.txt',
  'fam_ids_pics_metadata_03_2026.txt',
  'gen_ids_pics_metadata_03_2026.txt',
  'filtered_imputation_sp_ids_pics_metadata_03_2026.txt',
  'filtered_imputation_fam_ids_pics_metadata_03_2026.txt',
  'filtered_imputation_gen_ids_pics_metadata_03_2026.txt'
];

// Fallback names (without _03_2026)
const METADATA_FALLBACKS = [
  'sp_ids_pics_metadata.txt',
  'fam_ids_pics_metadata.txt',
  'gen_ids_pics_metadata.txt',
  'filtered_imputation_sp_ids_pics_metadata.txt',
  'filtered_imputation_fam_ids_pics_metadata.txt',
  'filtered_imputation_gen_ids_pics_metadata.txt'
];

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extractDate(author) {
  const match = author.match(/\((\d{4})\)/);
  return match ? match[1] : '';
}

function getCopyrightText(author) {
  if (!author || author === 'NA' || author.trim() === '') return null;

  // Rule 1 & 2: "Various authors" or "Blackwater"
  if (author.includes('Various authors') || author.includes('Blackwater')) {
    const date = extractDate(author);
    return date ? '\u00A9 Blackwater Facebook group (' + date + ')' : '\u00A9 Blackwater Facebook group';
  }

  // Rule 3: "Ulsan sampling"
  if (author.toLowerCase().includes('ulsan sampl')) {
    const date = extractDate(author);
    return date ? '\u00A9 the99Spiker (' + date + ')' : '\u00A9 the99Spiker';
  }

  // Rule 4/5/6: "Current study" variants
  if (author.startsWith('Current study')) {
    return '\u00A9 Ruiz et al. (2026)';
  }

  // Rule 7: All others - first part before " - "
  const dashIdx = author.indexOf(' - ');
  const name = dashIdx >= 0 ? author.substring(0, dashIdx).trim() : author.trim();
  const date = extractDate(author);
  if (date) {
    const cleanName = name.replace(/\s*\(\d{4}\)\s*/, '').trim();
    return '\u00A9 ' + cleanName + ' (' + date + ')';
  }
  return '\u00A9 ' + name;
}

function findMetadataFile(metaFile) {
  // Try multiple locations in order
  const locations = [
    path.join('/var/www/eliot/images', metaFile),
    path.join(SOURCE_DIR, metaFile),
    path.join(SOURCE_DIR, 'Final image database', metaFile),
  ];
  // Also try fallback name
  const fallbackName = metaFile.replace('_03_2026', '');
  if (fallbackName !== metaFile) {
    locations.push(path.join('/var/www/eliot/images', fallbackName));
    locations.push(path.join(SOURCE_DIR, fallbackName));
    locations.push(path.join(SOURCE_DIR, 'Final image database', fallbackName));
  }
  for (const loc of locations) {
    if (fs.existsSync(loc)) return loc;
  }
  return null;
}

function parseMetadataFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split('@').map(h => h.replace(/"/g, '').trim());
  const authorIdx = headers.indexOf('AUTHOR');
  const pathIdx = headers.indexOf('PATH');
  const fileIdx = headers.indexOf('FILE_NAME');

  if (authorIdx < 0 || pathIdx < 0 || fileIdx < 0) {
    console.error('Missing columns in ' + filePath + ': AUTHOR=' + authorIdx + ' PATH=' + pathIdx + ' FILE_NAME=' + fileIdx);
    return [];
  }

  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('@').map(c => c.replace(/"/g, '').trim());
    if (cols.length <= Math.max(authorIdx, pathIdx, fileIdx)) continue;

    let dir = cols[pathIdx];
    const fileName = cols[fileIdx];
    const author = cols[authorIdx];

    // Strip known prefixes from PATH
    if (dir.startsWith('Final image database/')) {
      dir = dir.substring('Final image database/'.length);
    }
    if (dir.startsWith('images/')) {
      dir = dir.substring('images/'.length);
    }

    entries.push({ dir, fileName, author });
  }
  return entries;
}

function createWatermarkSvg(imgWidth, imgHeight, text) {
  // Rectangle width = 20% of image width (CHANGED from 10%), min 120px
  const rectWidth = Math.max(120, Math.round(imgWidth * 0.20));
  // Font size proportional to rect width
  const fontSize = Math.min(32, Math.max(8, Math.round(rectWidth / 10)));
  const padX = Math.round(fontSize * 0.7);
  const padY = Math.round(fontSize * 0.6);

  // Word-wrap text
  const charsPerLine = Math.max(1, Math.floor((rectWidth - 2 * padX) / (fontSize * 0.55)));
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    const test = currentLine ? currentLine + ' ' + word : word;
    if (test.length > charsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.3;
  const textBlockHeight = lines.length * lineHeight;
  const rectHeight = textBlockHeight + 2 * padY;
  // Generous rounded corners: 25% of the shorter side
  const borderRadius = Math.round(Math.min(rectWidth, rectHeight) * 0.25);

  // Position: RIGHT UPPER CORNER with small margin
  const margin = Math.max(6, Math.round(imgWidth * 0.015));
  const rectX = imgWidth - rectWidth - margin;
  const rectY = margin;

  // Build text tspans - centered horizontally and vertically
  const textStartY = rectY + padY + fontSize * 0.85;
  let textLines = '';
  for (let i = 0; i < lines.length; i++) {
    const y = textStartY + i * lineHeight;
    textLines += '<tspan x="' + (rectX + rectWidth / 2) + '" y="' + y + '">' + escapeXml(lines[i]) + '</tspan>';
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + imgWidth + '" height="' + imgHeight + '">' +
    '<rect x="' + rectX + '" y="' + rectY + '" width="' + rectWidth + '" height="' + rectHeight + '" rx="' + borderRadius + '" ry="' + borderRadius + '" fill="rgba(0,0,0,0.55)" />' +
    '<text font-family="Segoe UI Semilight, Segoe UI, sans-serif" font-size="' + fontSize + '" fill="white" text-anchor="middle">' + textLines + '</text>' +
    '</svg>';
}

function findSourceFile(entry) {
  // Try multiple path patterns to find the source image
  const candidates = [
    path.join(SOURCE_DIR, entry.dir, entry.fileName),
    path.join(SOURCE_DIR, 'Final image database', entry.dir, entry.fileName),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

async function processImage(entry) {
  const copyright = getCopyrightText(entry.author);
  if (!copyright) return { status: 'skip', reason: 'no author' };

  const srcPath = findSourceFile(entry);
  if (!srcPath) {
    return { status: 'missing', path: path.join(entry.dir, entry.fileName) };
  }

  // Output with same dir structure
  const outPath = path.join(OUTPUT_DIR, entry.dir, entry.fileName);
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  try {
    const metadata = await sharp(srcPath).metadata();
    const width = metadata.width;
    const height = metadata.height;
    if (!width || !height) return { status: 'skip', reason: 'no dimensions' };

    const svgOverlay = createWatermarkSvg(width, height, copyright);
    const svgBuffer = Buffer.from(svgOverlay);

    const ext = path.extname(entry.fileName).toLowerCase();
    const result = sharp(srcPath)
      .composite([{ input: svgBuffer, top: 0, left: 0 }]);

    if (ext === '.jpg' || ext === '.jpeg') {
      await result.jpeg({ quality: 92 }).toFile(outPath + '.tmp');
    } else if (ext === '.png') {
      await result.png().toFile(outPath + '.tmp');
    } else {
      await result.toFile(outPath + '.tmp');
    }

    fs.renameSync(outPath + '.tmp', outPath);
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', path: srcPath, error: err.message };
  }
}

async function main() {
  console.log('=== Watermark V4 - Clean originals, 20% width, single watermark ===');
  console.log('Source (CLEAN, read-only): ' + SOURCE_DIR);
  console.log('Output (watermarked):     ' + OUTPUT_DIR);
  console.log('');

  // Safety check: output dir must NOT be the same as source dir
  if (OUTPUT_DIR === SOURCE_DIR) {
    console.error('FATAL: Output dir same as source dir! Aborting.');
    process.exit(1);
  }

  // Create output dir
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Parse all metadata files
  const seen = new Set();
  const allEntries = [];

  for (const metaFile of METADATA_FILES) {
    const fullPath = findMetadataFile(metaFile);
    if (!fullPath) {
      console.log('Skipping missing metadata: ' + metaFile);
      continue;
    }
    const entries = parseMetadataFile(fullPath);
    console.log('Parsed ' + entries.length + ' entries from ' + path.basename(fullPath));
    for (const entry of entries) {
      const key = entry.dir + '/' + entry.fileName;
      if (!seen.has(key)) {
        seen.add(key);
        allEntries.push(entry);
      }
    }
  }

  console.log('\nTotal unique images to watermark: ' + allEntries.length);

  let ok = 0, errors = 0, missing = 0, skipped = 0;
  const errorList = [];
  const missingList = [];

  for (let i = 0; i < allEntries.length; i++) {
    const result = await processImage(allEntries[i]);
    if (result.status === 'ok') ok++;
    else if (result.status === 'error') {
      errors++;
      errorList.push({ path: result.path, error: result.error });
    }
    else if (result.status === 'missing') {
      missing++;
      missingList.push(result.path);
    }
    else skipped++;

    if ((i + 1) % 500 === 0) {
      console.log('Progress: ' + (i + 1) + '/' + allEntries.length + ' (ok=' + ok + ', err=' + errors + ', miss=' + missing + ', skip=' + skipped + ')');
    }
  }

  console.log('\n=== RESULTS ===');
  console.log('Total:   ' + allEntries.length);
  console.log('OK:      ' + ok);
  console.log('Errors:  ' + errors);
  console.log('Missing: ' + missing);
  console.log('Skipped: ' + skipped);

  if (errorList.length > 0) {
    console.log('\nFirst 20 errors:');
    errorList.slice(0, 20).forEach(e => console.log('  ' + e.path + ': ' + e.error));
  }
  if (missingList.length > 0) {
    console.log('\nFirst 20 missing:');
    missingList.slice(0, 20).forEach(p => console.log('  ' + p));
  }

  // Copy metadata files to output dir (app needs them alongside images)
  const allMetaNames = [...METADATA_FILES, ...METADATA_FALLBACKS];
  const copiedMeta = new Set();
  for (const metaFile of allMetaNames) {
    const fullPath = findMetadataFile(metaFile);
    if (fullPath && !copiedMeta.has(metaFile)) {
      const destPath = path.join(OUTPUT_DIR, metaFile);
      fs.copyFileSync(fullPath, destPath);
      copiedMeta.add(metaFile);
      console.log('Copied metadata: ' + metaFile);
    }
  }

  // Also copy any remaining image dirs that don't have metadata entries
  // (like classified_bw_images_*) — these get NO watermark, just a plain copy
  const sourceDirs = fs.readdirSync(SOURCE_DIR).filter(f => {
    const fullP = path.join(SOURCE_DIR, f);
    return fs.statSync(fullP).isDirectory();
  });

  // Check if there's a "Final image database" subdir
  let imageRoot = SOURCE_DIR;
  if (fs.existsSync(path.join(SOURCE_DIR, 'Final image database'))) {
    imageRoot = path.join(SOURCE_DIR, 'Final image database');
  }

  const imageDirs = fs.readdirSync(imageRoot).filter(f => {
    const fullP = path.join(imageRoot, f);
    return fs.statSync(fullP).isDirectory();
  });

  for (const dir of imageDirs) {
    const outDir = path.join(OUTPUT_DIR, dir);
    if (!fs.existsSync(outDir)) {
      // Directory has no watermarked images — copy as-is (BW images, etc.)
      console.log('Copying non-metadata dir as-is: ' + dir);
      copyDirRecursive(path.join(imageRoot, dir), outDir);
    }
  }

  console.log('\nDone! Watermarked images are in: ' + OUTPUT_DIR);
  console.log('To deploy: replace /var/www/eliot/images/ with this directory');
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src);
  for (const entry of entries) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
