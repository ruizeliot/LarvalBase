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
 * Optionally includes a copyright query param for watermark overlay.
 */
export function buildImageUrl(imagePath: string, filename: string, copyright?: string): string {
  const base = `/api/images/${encodeImagePath(imagePath)}/${encodeURIComponent(filename)}`;
  if (copyright) {
    return `${base}?copyright=${encodeURIComponent(copyright)}`;
  }
  return base;
}

/**
 * Extract copyright text from an image author string.
 * Applies the same rules as the burn_copyright.py script.
 */
export function extractCopyright(author: string): string {
  if (!author || author.trim() === '') return '';
  author = author.trim();

  // "Various authors" -> "Blackwater Facebook group" + date
  if (author.startsWith('Various authors')) {
    const dateMatch = author.match(/\((\d{4})\)/);
    if (dateMatch) {
      return `\u00a9 Blackwater Facebook group (${dateMatch[1]})`;
    }
    return '\u00a9 Blackwater Facebook group';
  }

  // "Ulsan" -> "the99Spiker"
  if (author.includes('Ulsan')) {
    const dateMatch = author.match(/\((\d{4})\)/);
    if (dateMatch) {
      return `\u00a9 the99Spiker (${dateMatch[1]})`;
    }
    return '\u00a9 the99Spiker';
  }

  // "Current study" -> "Ruiz et al."
  if (author.includes('Current study')) {
    const dateMatch = author.match(/\((\d{4})\)/);
    if (dateMatch) {
      return `\u00a9 Ruiz et al. (${dateMatch[1]})`;
    }
    return '\u00a9 Ruiz et al.';
  }

  // Otherwise use part before first " - "
  const parts = author.split(' - ');
  const name = parts[0].trim();
  return `\u00a9 ${name}`;
}
