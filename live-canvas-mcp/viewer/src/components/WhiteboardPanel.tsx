import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';

// Server object format (from HTTP API)
export interface ServerCanvasObject {
  id: string;
  type: 'rect' | 'circle' | 'text' | 'line' | 'arrow' | 'path';
  left: number;
  top: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  points?: number[];
  fontSize?: number;
}

// Convert server object to Excalidraw element
function serverObjectToExcalidraw(obj: ServerCanvasObject): ExcalidrawElement | null {
  const baseProps = {
    id: obj.id,
    x: obj.left,
    y: obj.top,
    strokeColor: obj.stroke || '#3b82f6',
    backgroundColor: obj.fill || 'transparent',
    fillStyle: 'solid' as const,
    strokeStyle: 'solid' as const,
    strokeWidth: obj.strokeWidth || 2,
    roughness: 0,
    opacity: 100,
    groupIds: [] as string[],
    frameId: null,
    index: 'a0' as const,
    roundness: null,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 100000),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
  };

  switch (obj.type) {
    case 'rect':
      return {
        ...baseProps,
        type: 'rectangle',
        width: obj.width || 100,
        height: obj.height || 60,
        angle: 0,
      } as unknown as ExcalidrawElement;

    case 'circle':
      return {
        ...baseProps,
        type: 'ellipse',
        width: (obj.radius || 50) * 2,
        height: (obj.radius || 50) * 2,
        angle: 0,
      } as unknown as ExcalidrawElement;

    case 'text':
      return {
        ...baseProps,
        type: 'text',
        text: obj.text || '',
        fontSize: obj.fontSize || 16,
        fontFamily: 1,
        textAlign: 'left',
        verticalAlign: 'top',
        width: (obj.text?.length || 1) * 10,
        height: (obj.fontSize || 16) * 1.5,
        angle: 0,
        baseline: obj.fontSize || 16,
        containerId: null,
        originalText: obj.text || '',
        autoResize: true,
        lineHeight: 1.25,
      } as unknown as ExcalidrawElement;

    case 'arrow':
      if (obj.points && obj.points.length >= 4) {
        return {
          ...baseProps,
          type: 'arrow',
          x: obj.points[0],
          y: obj.points[1],
          width: Math.abs(obj.points[2] - obj.points[0]),
          height: Math.abs(obj.points[3] - obj.points[1]),
          angle: 0,
          points: [[0, 0], [obj.points[2] - obj.points[0], obj.points[3] - obj.points[1]]],
          lastCommittedPoint: null,
          startBinding: null,
          endBinding: null,
          startArrowhead: null,
          endArrowhead: 'arrow',
          elbowed: false,
        } as unknown as ExcalidrawElement;
      }
      return null;

    case 'line':
      if (obj.points && obj.points.length >= 4) {
        return {
          ...baseProps,
          type: 'line',
          x: obj.points[0],
          y: obj.points[1],
          width: Math.abs(obj.points[2] - obj.points[0]),
          height: Math.abs(obj.points[3] - obj.points[1]),
          angle: 0,
          points: [[0, 0], [obj.points[2] - obj.points[0], obj.points[3] - obj.points[1]]],
          lastCommittedPoint: null,
          startBinding: null,
          endBinding: null,
          startArrowhead: null,
          endArrowhead: null,
        } as unknown as ExcalidrawElement;
      }
      return null;

    default:
      return null;
  }
}

// Skeleton element format (from MCP visualization tools)
export interface DiagramSkeleton {
  type: 'rectangle' | 'ellipse' | 'arrow' | 'text';
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: { text: string };
  text?: string;
  points?: [number, number][];
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: 'solid' | 'hachure' | 'cross-hatch';
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  roundness?: { type: number; value?: number } | null;
  startArrowhead?: string | null;
  endArrowhead?: string | null;
  startBinding?: { elementId: string; focus: number; gap: number } | null;
  endBinding?: { elementId: string; focus: number; gap: number } | null;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: 'left' | 'center' | 'right';
}

// Convert diagram skeleton to Excalidraw element
function skeletonToExcalidraw(skeleton: DiagramSkeleton): ExcalidrawElement | null {
  const baseProps = {
    id: skeleton.id,
    x: skeleton.x,
    y: skeleton.y,
    strokeColor: skeleton.strokeColor || '#1e1e1e',
    backgroundColor: skeleton.backgroundColor || 'transparent',
    fillStyle: skeleton.fillStyle || 'solid',
    strokeStyle: 'solid' as const,
    strokeWidth: skeleton.strokeWidth || 2,
    roughness: skeleton.roughness ?? 1,
    opacity: skeleton.opacity ?? 100,
    groupIds: [] as string[],
    frameId: null,
    index: 'a0' as const,
    roundness: skeleton.roundness || null,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 100000),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    angle: 0,
  };

  switch (skeleton.type) {
    case 'rectangle':
      return {
        ...baseProps,
        type: 'rectangle',
        width: skeleton.width || 100,
        height: skeleton.height || 60,
      } as unknown as ExcalidrawElement;

    case 'ellipse':
      return {
        ...baseProps,
        type: 'ellipse',
        width: skeleton.width || 100,
        height: skeleton.height || 60,
      } as unknown as ExcalidrawElement;

    case 'arrow':
      if (skeleton.points && skeleton.points.length >= 2) {
        return {
          ...baseProps,
          type: 'arrow',
          width: Math.abs(skeleton.points[1][0]),
          height: Math.abs(skeleton.points[1][1]),
          points: skeleton.points,
          lastCommittedPoint: null,
          startBinding: skeleton.startBinding || null,
          endBinding: skeleton.endBinding || null,
          startArrowhead: skeleton.startArrowhead || null,
          endArrowhead: skeleton.endArrowhead || 'arrow',
          elbowed: false,
        } as unknown as ExcalidrawElement;
      }
      return null;

    case 'text':
      return {
        ...baseProps,
        type: 'text',
        text: skeleton.text || '',
        fontSize: skeleton.fontSize || 16,
        fontFamily: skeleton.fontFamily || 1,
        textAlign: skeleton.textAlign || 'center',
        verticalAlign: 'middle',
        width: (skeleton.text?.length || 1) * 8,
        height: (skeleton.fontSize || 16) * 1.5,
        baseline: skeleton.fontSize || 16,
        containerId: null,
        originalText: skeleton.text || '',
        autoResize: true,
        lineHeight: 1.25,
      } as unknown as ExcalidrawElement;

    default:
      return null;
  }
}

export interface WhiteboardPanelRef {
  exportAsImage: () => Promise<string | null>;
  getElements: () => unknown[];
  addElements: (elements: unknown[]) => void;
  addServerObject: (obj: ServerCanvasObject) => void;
  setServerObjects: (objects: ServerCanvasObject[]) => void;
  handleDiagramElements: (skeletons: DiagramSkeleton[], diagramType: string) => void;
  clear: () => void;
}

export interface WhiteboardPanelProps {
  serverObjects?: ServerCanvasObject[];
}

export const WhiteboardPanel = forwardRef<WhiteboardPanelRef, WhiteboardPanelProps>((props, ref) => {
  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [isReady, setIsReady] = useState(false);
  // Track server object IDs to avoid duplicates
  const serverObjectIdsRef = useRef<Set<string>>(new Set());
  // Track diagram element IDs by diagram type (for replace behavior)
  const diagramElementIdsRef = useRef<Record<string, Set<string>>>({});

  // Sync serverObjects prop to Excalidraw
  useEffect(() => {
    if (!isReady || !excalidrawApiRef.current || !props.serverObjects) return;

    const newElements: ExcalidrawElement[] = [];

    for (const obj of props.serverObjects) {
      // Skip if already added
      if (serverObjectIdsRef.current.has(obj.id)) continue;

      const element = serverObjectToExcalidraw(obj);
      if (element) {
        newElements.push(element);
        serverObjectIdsRef.current.add(obj.id);
      }
    }

    if (newElements.length > 0) {
      const existing = excalidrawApiRef.current.getSceneElements();
      excalidrawApiRef.current.updateScene({
        elements: [...existing, ...newElements] as never,
      });
      console.log('[Whiteboard] Added', newElements.length, 'server objects');
    }
  }, [props.serverObjects, isReady]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    exportAsImage: async () => {
      if (!excalidrawApiRef.current) return null;

      try {
        const elements = excalidrawApiRef.current.getSceneElements();
        if (elements.length === 0) return null;

        const blob = await exportToBlob({
          elements,
          appState: excalidrawApiRef.current.getAppState(),
          files: excalidrawApiRef.current.getFiles(),
          mimeType: 'image/png',
          quality: 0.9,
        });

        // Convert to base64
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.error('Failed to export whiteboard:', err);
        return null;
      }
    },

    getElements: () => {
      if (!excalidrawApiRef.current) return [];
      return [...excalidrawApiRef.current.getSceneElements()];
    },

    addElements: (elements: unknown[]) => {
      if (!excalidrawApiRef.current) return;
      const existing = excalidrawApiRef.current.getSceneElements();
      excalidrawApiRef.current.updateScene({
        elements: [...existing, ...elements] as never,
      });
    },

    addServerObject: (obj: ServerCanvasObject) => {
      if (!excalidrawApiRef.current) return;
      if (serverObjectIdsRef.current.has(obj.id)) return;

      const element = serverObjectToExcalidraw(obj);
      if (element) {
        const existing = excalidrawApiRef.current.getSceneElements();
        excalidrawApiRef.current.updateScene({
          elements: [...existing, element] as never,
        });
        serverObjectIdsRef.current.add(obj.id);
        console.log('[Whiteboard] Added server object:', obj.id);
      }
    },

    setServerObjects: (objects: ServerCanvasObject[]) => {
      if (!excalidrawApiRef.current) return;

      // Convert all server objects
      const elements = objects
        .map(serverObjectToExcalidraw)
        .filter((e): e is ExcalidrawElement => e !== null);

      // Get user-drawn elements (not from server)
      const userElements = excalidrawApiRef.current
        .getSceneElements()
        .filter(el => !serverObjectIdsRef.current.has(el.id));

      // Update tracking
      serverObjectIdsRef.current = new Set(objects.map(o => o.id));

      // Merge user elements with new server elements
      excalidrawApiRef.current.updateScene({
        elements: [...userElements, ...elements] as never,
      });
      console.log('[Whiteboard] Synced', elements.length, 'server objects');
    },

    handleDiagramElements: (skeletons: DiagramSkeleton[], diagramType: string) => {
      if (!excalidrawApiRef.current) return;

      // Convert skeletons to Excalidraw elements
      const elements = skeletons
        .map(skeletonToExcalidraw)
        .filter((e): e is ExcalidrawElement => e !== null);

      // Get old element IDs for this diagram type
      const oldIds = diagramElementIdsRef.current[diagramType] || new Set<string>();

      // Get current elements excluding old diagram elements
      const currentElements = excalidrawApiRef.current.getSceneElements();
      const otherElements = currentElements.filter(el => !oldIds.has(el.id));

      // Update scene with other elements + new diagram elements
      excalidrawApiRef.current.updateScene({
        elements: [...otherElements, ...elements] as never,
      });

      // Track new IDs for this diagram type
      diagramElementIdsRef.current[diagramType] = new Set(elements.map(e => e.id));
      console.log('[Whiteboard] Diagram elements rendered:', diagramType, elements.length);
    },

    clear: () => {
      if (!excalidrawApiRef.current) return;
      excalidrawApiRef.current.updateScene({
        elements: [],
      });
      serverObjectIdsRef.current.clear();
      diagramElementIdsRef.current = {};
    },
  }), []);

  const handleExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
    excalidrawApiRef.current = api;
    if (!isReady) {
      setIsReady(true);
    }
  }, [isReady]);

  const handleChange = useCallback((
    elements: readonly unknown[],
  ) => {
    // Could send element changes to server here for AI awareness
    // For now, we capture on-demand when user clicks Send
    console.log('[Whiteboard] Elements changed:', elements.length);
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        Whiteboard
        <span className="hint">(draw anything - AI can see this)</span>
      </div>
      <div className="panel-content whiteboard-container">
        <Excalidraw
          excalidrawAPI={handleExcalidrawAPI}
          onChange={handleChange}
          theme="dark"
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveToActiveFile: false,
            },
          }}
          initialData={{
            appState: {
              viewBackgroundColor: '#1a1a2e',
              currentItemStrokeColor: '#3b82f6',
              currentItemBackgroundColor: 'transparent',
            },
          }}
        />
      </div>
    </div>
  );
});

WhiteboardPanel.displayName = 'WhiteboardPanel';
