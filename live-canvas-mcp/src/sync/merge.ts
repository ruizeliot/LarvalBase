/**
 * Version-based element merge for canvas synchronization
 *
 * Implements Excalidraw's collaboration pattern for conflict resolution:
 * - Higher version number wins
 * - Same version: lower versionNonce wins (deterministic tiebreaker)
 *
 * This ensures all clients applying the same merge will converge
 * to identical state, even with concurrent edits.
 */

import { SyncableElement } from "../rooms/types.js";

/**
 * Merge local and remote elements with version-based conflict resolution
 *
 * @param localElements - Current local canvas elements
 * @param remoteElements - Incoming remote elements
 * @returns Merged array with conflicts resolved deterministically
 *
 * Resolution rules:
 * 1. If element is new (id not in local): add it
 * 2. If remote.version > local.version: use remote (newer edit)
 * 3. If remote.version === local.version AND remote.versionNonce < local.versionNonce:
 *    use remote (deterministic tiebreaker - lower nonce wins)
 * 4. Otherwise: keep local
 *
 * WHY versionNonce: When two clients edit simultaneously and produce the
 * same version number, the random nonce provides a deterministic winner.
 * All clients will pick the same winner (lower nonce), ensuring convergence.
 */
export function mergeElements(
  localElements: SyncableElement[],
  remoteElements: SyncableElement[]
): SyncableElement[] {
  // Build map from local elements (id -> element)
  const elementMap = new Map<string, SyncableElement>();

  for (const element of localElements) {
    elementMap.set(element.id, element);
  }

  // Process remote elements with conflict resolution
  for (const remoteElement of remoteElements) {
    const localElement = elementMap.get(remoteElement.id);

    if (!localElement) {
      // New element from remote - add it
      elementMap.set(remoteElement.id, remoteElement);
      continue;
    }

    // Compare versions
    if (remoteElement.version > localElement.version) {
      // Remote is newer - use it
      elementMap.set(remoteElement.id, remoteElement);
    } else if (
      remoteElement.version === localElement.version &&
      remoteElement.versionNonce < localElement.versionNonce
    ) {
      // Same version, lower nonce wins (deterministic tiebreaker)
      elementMap.set(remoteElement.id, remoteElement);
    }
    // Otherwise: keep local (higher version or same version with higher/equal nonce)
  }

  return Array.from(elementMap.values());
}

// Re-export SyncableElement for convenience
export type { SyncableElement } from "../rooms/types.js";
