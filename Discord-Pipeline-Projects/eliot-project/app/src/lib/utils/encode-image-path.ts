/**
 * Encode an image path for use in /api/images/ URLs.
 *
 * Splits path by "/" and encodes each segment individually,
 * so multi-level paths produce multiple URL segments
 * (rather than a single segment with %2F).
 *
 * Handles spaces, special characters, and nested directories.
 */
export function encodeImagePath(imagePath: string): string {
  return imagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * Build a full /api/images/ URL from a path and filename.
 * Both are individually encoded to handle spaces and special characters.
 */
export function buildImageUrl(imagePath: string, filename: string): string {
  return `/api/images/${encodeImagePath(imagePath)}/${encodeURIComponent(filename)}`;
}
