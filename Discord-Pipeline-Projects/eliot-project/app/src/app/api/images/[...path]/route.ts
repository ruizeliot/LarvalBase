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
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params;

    // Reconstruct the file path from URL segments
    // URL-decode each segment to handle spaces and special characters
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

    // Read and serve the file
    const file = await fs.readFile(resolvedPath);
    const ext = path.extname(resolvedPath);
    const contentType = getContentType(ext);

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable', // Cache 7 days
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
