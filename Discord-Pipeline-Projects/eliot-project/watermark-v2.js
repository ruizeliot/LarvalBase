const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = '/var/www/eliot/images-original';
const OUTPUT_DIR = '/var/www/eliot/images';
const METADATA_FILES = [
  'sp_ids_pics_metadata.txt',
  'fam_ids_pics_metadata.txt',
  'gen_ids_pics_metadata.txt'
];

function extractDate(author) {
  const match = author.match(/\((\d{4})\)/);
  return match ? match[1] : '';
}

function getCopyrightText(author) {
  if (!author) return null;

  // Rule 1: "Various authors" or "Blackwater Facebook group"
  if (author.includes('Blackwater Facebook group') || author.startsWith('Various authors')) {
    const date = extractDate(author);
    return date ? '\u00A9 Blackwater Facebook group (' + date + ')' : '\u00A9 Blackwater Facebook group';
  }

  // Rule 2: "Ulsan sampling(s)"
  if (author.toLowerCase().includes('ulsan sampl')) {
    const date = extractDate(author);
    return date ? '\u00A9 the99Spiker (' + date + ')' : '\u00A9 the99Spiker';
  }

  // Rule 3: "Current study" variants
  if (author === 'Current study' || author.startsWith('Current study (IchthyoGwada)') || author.startsWith('Current study (ADLIFISH') || author.startsWith('Current study')) {
    return '\u00A9 Ruiz et al. (2026)';
  }

  // Rule 4: All others - first part before " - " separator
  const dashIdx = author.indexOf(' - ');
  const name = dashIdx >= 0 ? author.substring(0, dashIdx).trim() : author.trim();
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
    // Also strip leading "images/" for classified_bw folders
    if (dir.startsWith('images/')) {
      dir = dir.substring('images/'.length);
    }

    entries.push({ dir, fileName, author });
  }
  return entries;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function createWatermarkSvg(imgWidth, imgHeight, text) {
  // Rectangle width = 10% of image width, min 80px
  var rectWidth = Math.max(80, Math.round(imgWidth * 0.10));
  // Font size proportional to rect width
  var fontSize = Math.min(24, Math.max(7, Math.round(rectWidth / 10)));
  var padX = Math.round(fontSize * 0.6);
  var padY = Math.round(fontSize * 0.5);

  // Word-wrap text
  var charsPerLine = Math.max(1, Math.floor((rectWidth - 2 * padX) / (fontSize * 0.55)));
  var words = text.split(' ');
  var lines = [];
  var currentLine = '';
  for (var w = 0; w < words.length; w++) {
    var word = words[w];
    var test = currentLine ? currentLine + ' ' + word : word;
    if (test.length > charsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);

  var lineHeight = fontSize * 1.3;
  var textBlockHeight = lines.length * lineHeight;
  var rectHeight = textBlockHeight + 2 * padY;
  var borderRadius = Math.round(Math.min(rectWidth, rectHeight) * 0.2);

  // Position: RIGHT UPPER CORNER
  var margin = Math.max(4, Math.round(imgWidth * 0.01));
  var rectX = imgWidth - rectWidth - margin;
  var rectY = margin;

  // Build text tspans
  var textLines = '';
  for (var i = 0; i < lines.length; i++) {
    var y = rectY + padY + fontSize + i * lineHeight;
    textLines += '<tspan x="' + (rectX + rectWidth / 2) + '" y="' + y + '">' + escapeXml(lines[i]) + '</tspan>';
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + imgWidth + '" height="' + imgHeight + '">' +
    '<rect x="' + rectX + '" y="' + rectY + '" width="' + rectWidth + '" height="' + rectHeight + '" rx="' + borderRadius + '" ry="' + borderRadius + '" fill="rgba(0,0,0,0.55)" />' +
    '<text font-family="Segoe UI Semilight, Segoe UI, sans-serif" font-size="' + fontSize + '" fill="white" text-anchor="middle">' + textLines + '</text>' +
    '</svg>';
}

async function processImage(entry) {
  var copyright = getCopyrightText(entry.author);
  if (!copyright) return { status: 'skip', reason: 'no author' };

  // Source: images-original, check multiple possible locations
  var srcPath = path.join(SOURCE_DIR, entry.dir, entry.fileName);
  if (!fs.existsSync(srcPath)) {
    srcPath = path.join(SOURCE_DIR, 'Final image database', entry.dir, entry.fileName);
  }
  if (!fs.existsSync(srcPath)) {
    // Try without subdir (for classified_bw images directly in images-original)
    srcPath = path.join(SOURCE_DIR, entry.dir, entry.fileName);
  }
  if (!fs.existsSync(srcPath)) {
    return { status: 'missing', path: srcPath };
  }

  // Output: images/ with same dir structure
  var outPath = path.join(OUTPUT_DIR, entry.dir, entry.fileName);
  var outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  try {
    var metadata = await sharp(srcPath).metadata();
    var width = metadata.width;
    var height = metadata.height;
    if (!width || !height) return { status: 'skip', reason: 'no dimensions' };

    var svgOverlay = createWatermarkSvg(width, height, copyright);
    var svgBuffer = Buffer.from(svgOverlay);

    var ext = path.extname(entry.fileName).toLowerCase();
    var result = sharp(srcPath)
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
  var seen = new Set();
  var allEntries = [];

  for (var m = 0; m < METADATA_FILES.length; m++) {
    var metaFile = METADATA_FILES[m];
    var fullPath = path.join(SOURCE_DIR, metaFile);
    if (!fs.existsSync(fullPath)) {
      console.log('Skipping missing metadata: ' + fullPath);
      continue;
    }
    var entries = parseMetadataFile(fullPath);
    console.log('Parsed ' + entries.length + ' entries from ' + metaFile);
    for (var e = 0; e < entries.length; e++) {
      var key = entries[e].dir + '/' + entries[e].fileName;
      if (!seen.has(key)) {
        seen.add(key);
        allEntries.push(entries[e]);
      }
    }
  }

  console.log('Total unique images to watermark: ' + allEntries.length);

  var ok = 0, errors = 0, missing = 0, skipped = 0;
  var errorList = [];
  var missingList = [];

  for (var i = 0; i < allEntries.length; i++) {
    var result = await processImage(allEntries[i]);
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
    errorList.slice(0, 20).forEach(function(e) { console.log('  ' + e.path + ': ' + e.error); });
  }
  if (missingList.length > 0) {
    console.log('\nFirst 20 missing:');
    missingList.slice(0, 20).forEach(function(p) { console.log('  ' + p); });
  }
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
