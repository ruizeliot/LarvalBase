/**
 * ImageCaption displays picture source with author link and scale info.
 *
 * Format:
 * - "Picture source: AUTHOR" (AUTHOR as hyperlink if LINK available)
 * - Scale info in italic below
 */

interface ImageCaptionProps {
  /** Raw author/source name */
  author: string;
  /** Display name for photographer */
  displayAuthor: string;
  /** Whether species identification is uncertain */
  uncertain: boolean;
  /** Human-readable source description (legacy, unused) */
  sourceDescription?: string;
  /** Whether scale/specimen size is available */
  scale?: boolean;
  /** URL link for the author/source */
  link?: string;
}

export function ImageCaption({ displayAuthor, uncertain, scale, link }: ImageCaptionProps) {
  return (
    <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground mt-2">
      <div className="flex items-center">
        <span>
          Picture source:{' '}
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              {displayAuthor}
            </a>
          ) : (
            displayAuthor
          )}
        </span>
      </div>
      {scale !== undefined && (
        <span className="text-xs italic opacity-75">
          {scale
            ? 'Specimen size or scale available in the source'
            : 'Specimen size or scale unavailable in the source'}
        </span>
      )}
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
    </div>
  );
}
