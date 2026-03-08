/**
 * API route to serve species images from images/ folder.
 *
 * Images are stored outside public/ in the project root images/ folder.
 * This route serves them dynamically with proper content-type headers.
 *
 * URL pattern: /api/images/{path}/{filename}
 * Example: /api/images/classified_bw_images_species/image.jpg
 *
 * Query params:
 * - w: max width for thumbnail (optional, serves original if omitted)
 * - copyright: copyright text to overlay as watermark (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Map file extension to content type.
 */
function getContentType(ext: string): string {
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return types[ext.toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Create an SVG overlay for copyright text, positioned at bottom-right.
 */
function createCopyrightOverlay(width: number, height: number, text: string): Buffer {
  // Font size proportional to image width (~2.5% of width, min 10 for readability)
  const fontSize = Math.max(10, Math.round(width * 0.025));
  // Escape XML special characters
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const padding = 8;
  // Estimate text width (rough: 0.6 * fontSize * char count)
  const textWidth = Math.ceil(escaped.length * fontSize * 0.6);
  const textHeight = fontSize + 4;

  const x = width - textWidth - padding - 8;
  const y = height - textHeight - padding - 4;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${x - 4}" y="${y - 2}" width="${textWidth + 8}" height="${textHeight + 6}" rx="2" fill="rgba(0,0,0,0.55)"/>
    <text x="${x}" y="${y + fontSize}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${fontSize}" fill="rgba(255,255,255,0.9)">${escaped}</text>
  </svg>`;

  return Buffer.from(svg);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params;

    // Reconstruct the file path from URL segments
    const decodedParts = pathParts.map((p) => decodeURIComponent(p));
    const imagePath = path.join(process.cwd(), 'images', ...decodedParts);

    // Security: Prevent directory traversal
    const imagesDir = path.join(process.cwd(), 'images');
    const resolvedPath = path.resolve(imagePath);
    if (!resolvedPath.startsWith(imagesDir)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }

    // Check file exists
    try {
      await fs.access(resolvedPath);
    } catch {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Read the file
    const file = await fs.readFile(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = getContentType(ext);

    // Optional query params
    const url = new URL(request.url);
    const maxWidth = url.searchParams.get('w') ? parseInt(url.searchParams.get('w')!, 10) : null;
    const quality = url.searchParams.get('q') ? parseInt(url.searchParams.get('q')!, 10) : 75;
    const copyrightText = url.searchParams.get('copyright') || null;

    // Compress JPEG/PNG/WebP images with sharp
    const compressible = ['.jpg', '.jpeg', '.png', '.webp'];
    if (compressible.includes(ext)) {
      try {
        let pipeline = sharp(file);

        if (maxWidth && maxWidth > 0) {
          pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
        }

        // Get image metadata for copyright overlay sizing
        if (copyrightText) {
          const metadata = await sharp(file).metadata();
          const imgWidth = maxWidth && maxWidth > 0
            ? Math.min(maxWidth, metadata.width || 800)
            : (metadata.width || 800);
          const imgHeight = metadata.height || 600;
          // Scale height proportionally if we resized width
          const scale = imgWidth / (metadata.width || 800);
          const scaledHeight = Math.round(imgHeight * scale);

          const overlay = createCopyrightOverlay(imgWidth, scaledHeight, copyrightText);
          pipeline = pipeline.composite([{ input: overlay, top: 0, left: 0 }]);
        }

        if (ext === '.png') {
          const buf = await pipeline.png({ quality: Math.min(quality, 100) }).toBuffer();
          return new NextResponse(new Uint8Array(buf), {
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=604800, immutable',
            },
          });
        } else {
          const buf = await pipeline.jpeg({ quality: Math.min(quality, 100), mozjpeg: true }).toBuffer();
          return new NextResponse(new Uint8Array(buf), {
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=604800, immutable',
            },
          });
        }
      } catch {
        // Fallback: serve original if sharp fails
      }
    }

    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  } catch (error) {
    console.error('[images-api] Error serving image:', error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}
