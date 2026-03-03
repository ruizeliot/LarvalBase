"use client";

import { getSectionIcon } from "@/lib/constants/section-icons";

/**
 * Reference data structure from the API.
 */
export interface Reference {
  source: string | null;
  doi: string | null;
}

/**
 * Props for the ReferencesSection component.
 */
export interface ReferencesSectionProps {
  references: Reference[];
}

/**
 * Format a DOI/LINK to a clickable URL.
 * - If it starts with "http", use as-is
 * - If it starts with "10." or "DOI" (case-insensitive), prepend https://doi.org/
 * - Strip "DOI:" prefix if present
 */
function formatLinkUrl(link: string | null): string | null {
  if (!link || link.trim() === '') return null;

  const trimmed = link.trim();

  // Already a URL
  if (trimmed.startsWith("http")) return trimmed;

  // Strip "DOI:" prefix (case-insensitive)
  const cleanDoi = trimmed.replace(/^doi:\s*/i, "");

  // If starts with "10." (DOI pattern) or was prefixed with DOI:
  if (cleanDoi.startsWith("10.") || trimmed.toLowerCase().startsWith("doi")) {
    return `https://doi.org/${cleanDoi}`;
  }

  // Fallback: treat as-is (could be some other link format)
  return trimmed;
}

/**
 * Create a unique key for a reference (for deduplication).
 */
function referenceKey(ref: Reference): string {
  return `${ref.source || ""}|${ref.doi || ""}`;
}

/**
 * ReferencesSection displays a list of references with clickable DOI links.
 *
 * Features:
 * - Deduplicates references by source+DOI combination
 * - Shows "Link" as hyperlink text (not raw DOI)
 * - If LINK starts with "10." or "DOI", prepends https://doi.org/
 * - If LINK is empty, shows "Link" in grey
 * - Section icon from References.svg
 */
export function ReferencesSection({ references }: ReferencesSectionProps) {
  // Deduplicate references by source+doi combination
  const uniqueRefs = new Map<string, Reference>();
  for (const ref of references) {
    const key = referenceKey(ref);
    if (!uniqueRefs.has(key)) {
      uniqueRefs.set(key, ref);
    }
  }
  const deduplicatedRefs = Array.from(uniqueRefs.values());

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{ width: 48, height: 48, backgroundColor: "#F5F5F5" }}
          title="References"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getSectionIcon("References")}
            alt="References icon"
            width={34}
            height={34}
          />
        </div>
        <h2 className="text-lg font-semibold">References</h2>
      </div>

      {deduplicatedRefs.length === 0 ? (
        <p className="text-muted-foreground">No references available</p>
      ) : (
        <ul className="space-y-2">
          {deduplicatedRefs.map((ref, index) => {
            const linkUrl = formatLinkUrl(ref.doi);
            const hasSource = ref.source && ref.source.trim().length > 0;

            // Handle case where both are null/empty
            if (!hasSource && !linkUrl) {
              return (
                <li key={index} className="text-sm">
                  <span>{ref.source || "Unknown reference"}</span>
                  <span className="mx-1">&mdash;</span>
                  <span className="text-muted-foreground">Link</span>
                </li>
              );
            }

            return (
              <li key={index} className="text-sm">
                {hasSource && (
                  <span>{ref.source}</span>
                )}
                {hasSource && <span className="mx-1">&mdash;</span>}
                {linkUrl ? (
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Link
                  </a>
                ) : (
                  <span className="text-muted-foreground">Link</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
