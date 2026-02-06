/**
 * ImageCaption displays photographer credit, certainty indicator, and source.
 *
 * Implements:
 * - IMG-03: Image caption shows author name
 * - IMG-04: Image caption shows certainty indicator
 * - NEW: Shows source (Blackwater, CRIOBE, etc.) with full attribution
 */

interface ImageCaptionProps {
  /** Raw author/source name */
  author: string;
  /** Display name for photographer (parsed for Blackwater) */
  displayAuthor: string;
  /** Whether species identification is uncertain */
  uncertain: boolean;
}

/**
 * Caption component for species images.
 * Shows photographer name, source, and uncertainty indicator.
 */
export function ImageCaption({ author, displayAuthor, uncertain }: ImageCaptionProps) {
  // Show source separately if different from display author
  const showSource = author !== displayAuthor;

  return (
    <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground mt-2">
      <div className="flex items-center gap-2">
        <span>Photo: {displayAuthor}</span>
        {uncertain && (
          <span
            className="text-yellow-500 font-medium"
            title="Species identification is uncertain"
          >
            (uncertain ID)
          </span>
        )}
      </div>
      {showSource && (
        <span className="text-xs opacity-75">Source: {author}</span>
      )}
    </div>
  );
}
