/**
 * Canvas synchronization hook for multi-user collaboration
 *
 * Provides throttled broadcasting of local canvas changes and merging
 * of remote updates with version-based conflict resolution.
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import throttle from 'lodash.throttle';
import type { Socket } from 'socket.io-client';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';

/**
 * Syncable canvas element with version-based conflict resolution
 * Matches server-side SyncableElement from live-canvas-mcp/src/rooms/types.ts
 */
export interface SyncableElement {
  /** Unique element identifier */
  id: string;
  /** Version number, incremented on each edit */
  version: number;
  /** Random nonce for deterministic same-version tiebreaker */
  versionNonce: number;
  /** Whether element has been deleted (soft delete for sync) */
  isDeleted: boolean;

  // Core element properties
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;

  // Visual properties
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: string;
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  angle?: number;

  // Type-specific properties
  points?: Array<[number, number]>;
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: string;
  verticalAlign?: string;

  // Arrow-specific properties
  startBinding?: { elementId: string; focus: number; gap: number } | null;
  endBinding?: { elementId: string; focus: number; gap: number } | null;
  startArrowhead?: string | null;
  endArrowhead?: string | null;

  // Grouping
  groupIds?: string[];

  // Allow additional Excalidraw properties
  [key: string]: unknown;
}

/**
 * Socket.IO events for canvas sync
 */
interface ServerToClientCanvasEvents {
  canvas_update: (data: { elements: SyncableElement[]; fromSocketId: string }) => void;
}

interface ClientToServerCanvasEvents {
  canvas_update: (data: { roomCode: string; elements: SyncableElement[] }) => void;
}

type CanvasSyncSocket = Socket<ServerToClientCanvasEvents, ClientToServerCanvasEvents>;

/**
 * Options for useCanvasSync hook
 */
interface UseCanvasSyncOptions {
  /** Socket.IO socket instance (null if not connected) */
  socket: CanvasSyncSocket | null;
  /** Current room code (null if not in a session) */
  roomCode: string | null;
  /** Callback when remote updates are received and merged */
  onRemoteUpdate: (elements: ExcalidrawElement[]) => void;
}

/**
 * Hook return type
 */
interface UseCanvasSyncReturn {
  /** Throttled function to broadcast local canvas changes */
  broadcastChanges: (elements: ExcalidrawElement[]) => void;
  /** Update local element reference (for merge operations) */
  setLocalElements: (elements: ExcalidrawElement[]) => void;
}

/**
 * Merge local and remote elements with version-based conflict resolution
 *
 * Resolution rules:
 * 1. If element is new (id not in local): add it
 * 2. If remote.version > local.version: use remote (newer edit)
 * 3. If remote.version === local.version AND remote.versionNonce < local.versionNonce:
 *    use remote (deterministic tiebreaker - lower nonce wins)
 * 4. Otherwise: keep local
 */
function mergeElements(
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

/**
 * Canvas synchronization hook for multi-user collaboration
 *
 * Usage:
 * ```tsx
 * const { broadcastChanges, setLocalElements } = useCanvasSync({
 *   socket: socketIO.getSocket(),
 *   roomCode: socketIO.roomCode,
 *   onRemoteUpdate: (elements) => whiteboardRef.current?.updateFromRemote(elements),
 * });
 *
 * // In Excalidraw onChange:
 * <Excalidraw onChange={(elements) => broadcastChanges(elements)} />
 * ```
 */
export function useCanvasSync(options: UseCanvasSyncOptions): UseCanvasSyncReturn {
  const { socket, roomCode, onRemoteUpdate } = options;

  // Track what we last broadcast to avoid unnecessary emissions
  const lastBroadcastRef = useRef<Map<string, { version: number; versionNonce: number }>>(
    new Map()
  );

  // Current local state for merging with remote updates
  const localElementsRef = useRef<ExcalidrawElement[]>([]);

  // Keep onRemoteUpdate stable for effect deps
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;

  /**
   * Update local elements reference
   */
  const setLocalElements = useCallback((elements: ExcalidrawElement[]) => {
    localElementsRef.current = elements;
  }, []);

  /**
   * Broadcast local canvas changes to the room
   * Only sends elements that have actually changed
   */
  const broadcastChangesRaw = useCallback(
    (elements: ExcalidrawElement[]) => {
      // Update local ref
      localElementsRef.current = elements;

      // Early exit if not connected to a room
      if (!socket || !roomCode) {
        return;
      }

      // Find elements that have changed since last broadcast
      const changedElements: SyncableElement[] = [];

      for (const element of elements) {
        const syncElement = element as unknown as SyncableElement;
        const lastBroadcast = lastBroadcastRef.current.get(syncElement.id);

        // Element is changed if:
        // - Never broadcast before
        // - Version has changed
        // - versionNonce has changed (new edit with same version)
        const hasChanged =
          !lastBroadcast ||
          lastBroadcast.version !== syncElement.version ||
          lastBroadcast.versionNonce !== syncElement.versionNonce;

        if (hasChanged) {
          changedElements.push(syncElement);
          // Update last broadcast tracking
          lastBroadcastRef.current.set(syncElement.id, {
            version: syncElement.version,
            versionNonce: syncElement.versionNonce,
          });
        }
      }

      // No changes to broadcast
      if (changedElements.length === 0) {
        return;
      }

      // Emit to server
      console.log('[CanvasSync] Broadcasting', changedElements.length, 'changed elements');
      socket.emit('canvas_update', {
        roomCode,
        elements: changedElements,
      });
    },
    [socket, roomCode]
  );

  /**
   * Throttled version of broadcast - 60Hz (16ms) for smooth collaboration
   * leading: true - send immediately on first call
   * trailing: true - ensure final state is sent after burst
   */
  const broadcastChanges = useMemo(
    () =>
      throttle(broadcastChangesRaw, 16, {
        leading: true,
        trailing: true,
      }),
    [broadcastChangesRaw]
  );

  /**
   * Set up socket listener for remote canvas updates
   */
  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleCanvasUpdate = (data: { elements: SyncableElement[]; fromSocketId: string }) => {
      console.log(
        '[CanvasSync] Received',
        data.elements.length,
        'elements from',
        data.fromSocketId
      );

      // Merge remote elements with local state
      const localAsSyncable = localElementsRef.current as unknown as SyncableElement[];
      const merged = mergeElements(localAsSyncable, data.elements);

      // Update local ref with merged result
      localElementsRef.current = merged as unknown as ExcalidrawElement[];

      // Also update broadcast tracking for merged elements
      for (const element of data.elements) {
        lastBroadcastRef.current.set(element.id, {
          version: element.version,
          versionNonce: element.versionNonce,
        });
      }

      // Notify parent to update UI
      onRemoteUpdateRef.current(merged as unknown as ExcalidrawElement[]);
    };

    socket.on('canvas_update', handleCanvasUpdate);

    console.log('[CanvasSync] Listener attached');

    // Cleanup on unmount or socket change
    return () => {
      socket.off('canvas_update', handleCanvasUpdate);
      // Cancel any pending throttled calls
      broadcastChanges.cancel();
      console.log('[CanvasSync] Listener removed');
    };
  }, [socket, broadcastChanges]);

  return {
    broadcastChanges,
    setLocalElements,
  };
}
