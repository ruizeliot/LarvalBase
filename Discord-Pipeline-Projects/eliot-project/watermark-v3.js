#!/usr/bin/env node
'use strict';

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Paths - images-original will be replaced with fresh ZIP extract
const SOURCE_DIR = '/var/www/eliot/images-clean';
const OUTPUT_DIR = '/var/www/eliot/images';
const METADATA_FILES = [
  'sp_ids_pics_metadata_03_2026.txt',
  'fam_ids_pics_metadata_03_2026.txt',
  'gen_ids_pics_metadata_03_2026.txt',
  'filtered_imputation_sp_ids_pics_metadata_03_2026.txt',
  'filtered_imputation_fam_ids_pics_metadata_03_2026.txt',
  'filtered_imputation_gen_ids_pics_metadata_03_2026.txt'
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
  // Extract year like (2010), (2025), etc.
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

  // Rule 3: "Ulsan sampling" variants
  if (author.toLowerCase().includes('ulsan sampl')) {
    const date = extractDate(author);
    return date ? '\u00A9 the99Spiker (' + date + ')' : '\u00A9 the99Spiker';
  }

  // Rule 4/5/6: "Current study" variants
  if (author.startsWith('Current study')) {
    return '\u00A9 Ruiz et al. (2026)';
  }

  // Rule 7: All others - first part before " - " separator
  const dashIdx = author.indexOf(' - ');
  const name = dashIdx >= 0 ? author.substring(0, dashIdx).trim() : author.trim();
  const date = extractDate(author);
  if (date) {
    // Remove the date from the name if it's already there
    const cleanName = name.replace(/\s*\(\d{4}\)\s*/, '').trim();
    return '\u00A9 ' + cleanName + ' (' + date + ')';
  }
  return '\u00A9 ' + name;
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

    // Strip "Final image database/" prefix from PATH
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
  // Rectangle width = 10% of image width, min 80px
  const rectWidth = Math.max(80, Math.round(imgWidth * 0.10));
  // Font size proportional to rect width
  const fontSize = Math.min(24, Math.max(7, Math.round(rectWidth / 10)));
  const padX = Math.round(fontSize * 0.6);
  const padY = Math.round(fontSize * 0.5);

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
  const borderRadius = Math.round(Math.min(rectWidth, rectHeight) * 0.2);

  // Position: RIGHT UPPER CORNER
  const margin = Math.max(4, Math.round(imgWidth * 0.01));
  const rectX = imgWidth - rectWidth - margin;
  const rectY = margin;

  // Build text tspans
  let textLines = '';
  for (let i = 0; i < lines.length; i++) {
    const y = rectY + padY + fontSize + i * lineHeight;
    textLines += '<tspan x="' + (rectX + rectWidth / 2) + '" y="' + y + '">' + escapeXml(lines[i]) + '</tspan>';
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + imgWidth + '" height="' + imgHeight + '">' +
    '<rect x="' + rectX + '" y="' + rectY + '" width="' + rectWidth + '" height="' + rectHeight + '" rx="' + borderRadius + '" ry="' + borderRadius + '" fill="rgba(0,0,0,0.55)" />' +
    '<text font-family="Segoe UI Semilight, Segoe UI, sans-serif" font-size="' + fontSize + '" fill="white" text-anchor="middle">' + textLines + '</text>' +
    '</svg>';
}

async function processImage(entry) {
  const copyright = getCopyrightText(entry.author);
  if (!copyright) return { status: 'skip', reason: 'no author' };

  // Source: images-clean (extracted from ZIP)
  let srcPath = path.join(SOURCE_DIR, entry.dir, entry.fileName);
  if (!fs.existsSync(srcPath)) {
    // Try with "Final image database" prefix
    srcPath = path.join(SOURCE_DIR, 'Final image database', entry.dir, entry.fileName);
  }
  if (!fs.existsSync(srcPath)) {
    return { status: 'missing', path: path.join(entry.dir, entry.fileName) };
  }

  // Output: images/ with same dir structure
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
  console.log('=== Watermark V3 - Clean originals from ZIP ===');
  console.log('Source: ' + SOURCE_DIR);
  console.log('Output: ' + OUTPUT_DIR);
  console.log('');

  // Parse all metadata files
  const seen = new Set();
  const allEntries = [];

  for (const metaFile of METADATA_FILES) {
    // Look for metadata in source dir root
    let fullPath = path.join(SOURCE_DIR, metaFile);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(SOURCE_DIR, 'Final image database', metaFile);
    }
    if (!fs.existsSync(fullPath)) {
      // Fall back to old naming
      const oldName = metaFile.replace('_03_2026', '');
      fullPath = path.join(SOURCE_DIR, oldName);
    }
    if (!fs.existsSync(fullPath)) {
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

  console.log('\nDone! Total: ' + allEntries.length);
  console.log('  OK: ' + ok);
  console.log('  Errors: ' + errors);
  console.log('  Missing: ' + missing);
  console.log('  Skipped: ' + skipped);

  if (errorList.length > 0) {
    console.log('\nFirst 20 errors:');
    errorList.slice(0, 20).forEach(e => console.log('  ' + e.path + ': ' + e.error));
  }
  if (missingList.length > 0) {
    console.log('\nFirst 20 missing:');
    missingList.slice(0, 20).forEach(p => console.log('  ' + p));
  }

  // Also copy metadata files to output images dir
  for (const metaFile of METADATA_FILES) {
    let fullPath = path.join(SOURCE_DIR, metaFile);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(SOURCE_DIR, 'Final image database', metaFile);
    }
    if (fs.existsSync(fullPath)) {
      // Copy to images dir with original name (without _03_2026 suffix if needed)
      const destName = metaFile;
      fs.copyFileSync(fullPath, path.join(OUTPUT_DIR, destName));
      // Also copy with old naming for backwards compat
      const oldName = metaFile.replace('_03_2026', '');
      if (oldName !== metaFile) {
        fs.copyFileSync(fullPath, path.join(OUTPUT_DIR, oldName));
      }
      console.log('Copied metadata: ' + destName);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
