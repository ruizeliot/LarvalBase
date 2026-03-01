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
  /** Human-readable source description (e.g., "Polynesia — CRIOBE field collection") */
  sourceDescription?: string;
}

/**
 * Caption component for species images.
 * Shows photographer name, source, and uncertainty indicator.
 */
export function ImageCaption({ author, displayAuthor, uncertain, sourceDescription }: ImageCaptionProps) {
  // Show source separately if different from display author
  const showSource = author !== displayAuthor;

  return (
    <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground mt-2">
      <div className="flex items-center">
        <span>Photo: {displayAuthor}</span>
      </div>
      <div>
        {uncertain ? (
          <span
            className="text-red-500 font-medium"
            title="Species identification is uncertain"
          >
            (Unsure ID)
          </span>
        ) : (
          <span
            className="text-green-500 font-medium"
            title="Species identification is confirmed"
          >
            (Sure ID)
          </span>
        )}
      </div>
      {sourceDescription ? (
        <span className="text-xs opacity-75">Source: {sourceDescription}</span>
      ) : showSource ? (
        <span className="text-xs opacity-75">Source: {author}</span>
      ) : null}
    </div>
  );
}
