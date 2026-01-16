import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useState,
} from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

export interface WhiteboardPanelRef {
  exportAsImage: () => Promise<string | null>;
  getElements: () => unknown[];
  addElements: (elements: unknown[]) => void;
  clear: () => void;
}

export const WhiteboardPanel = forwardRef<WhiteboardPanelRef>((_props, ref) => {
  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [isReady, setIsReady] = useState(false);

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

    clear: () => {
      if (!excalidrawApiRef.current) return;
      excalidrawApiRef.current.updateScene({
        elements: [],
      });
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
