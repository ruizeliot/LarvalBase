import { useState, useCallback, useRef, useEffect } from 'react';
import { NotesPanel } from './components/NotesPanel';
import { WhiteboardPanel, WhiteboardPanelRef, ServerCanvasObject, DiagramSkeleton } from './components/WhiteboardPanel';
import { DiagramPanel, Diagram } from './components/DiagramPanel';
import { InputArea } from './components/InputArea';
import { SessionControls } from './components/SessionControls';
import { useWebSocket } from './hooks/useWebSocket';
import { useSocketIO, ChatMessage } from './hooks/useSocketIO';
import { useCanvasSync } from './hooks/useCanvasSync';
import { usePreferencesStore } from './stores/preferencesStore';
import { useSessionStore, DiamondPhase } from './stores/sessionStore';
import type { CanvasEdit } from './hooks/useCanvasEdits';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';

export default function App() {
  const [notes, setNotes] = useState('');
  const [serverObjects, setServerObjects] = useState<ServerCanvasObject[]>([]);
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  const whiteboardRef = useRef<WhiteboardPanelRef>(null);

  // Preferences from Zustand store
  const {
    proactivity, setProactivity,
    animationSpeed, setAnimationSpeed,
    defaultComplexity, setDefaultComplexity,
    preferredDiagramStyle, setPreferredDiagramStyle,
  } = usePreferencesStore();

  // Session state from zustand store
  const sessionPhase = useSessionStore((state) => state.phase);
  const sessionDiamond = useSessionStore((state) => state.diamond);
  const sessionTurnCount = useSessionStore((state) => state.turnCount);
  const updateSessionFromServer = useSessionStore((state) => state.updateFromServer);

  // Socket.IO for multi-user sessions
  const socketIO = useSocketIO({
    onCanvasState: (state) => {
      // When joining a session, receive the host's canvas state
      console.log('[App] Received canvas state from session');
      // Update whiteboard with the received state
      if (Array.isArray(state)) {
        whiteboardRef.current?.updateFromRemote(state as ExcalidrawElement[]);
      }
    },
    onSessionEnded: (_reason, message) => {
      // Session ended by host
      alert(`Session ended: ${message}`);
      // Clear session messages
      setSessionMessages([]);
    },
    onUserJoined: (socketId, userName) => {
      console.log('[App] User joined session:', socketId, userName);
    },
    onUserLeft: (socketId) => {
      console.log('[App] User left session:', socketId);
    },
    onMessageReceived: (message) => {
      console.log('[App] Chat message received:', message.id);
      setSessionMessages(prev => {
        // Add message and sort by timestamp for correct order
        const updated = [...prev, message];
        return updated.sort((a, b) => a.timestamp - b.timestamp);
      });
    },
  });

  // Destructure for convenience
  const {
    isConnected: socketIOConnected,
    roomCode,
    isHost,
    sessionUrl,
    createSession,
    joinSession,
    leaveSession,
    getSocket,
  } = socketIO;

  // Canvas sync for multi-user collaboration
  const { broadcastChanges } = useCanvasSync({
    socket: getSocket(),
    roomCode,
    onRemoteUpdate: (elements) => {
      // Update whiteboard with merged remote state
      whiteboardRef.current?.updateFromRemote(elements);
    },
  });

  const { isConnected, send } = useWebSocket({
    onMessage: (msg) => {
      // Notes sync from AI
      if (msg.type === 'notes_sync' && msg.fromAI) {
        setNotes(msg.content as string);
      }

      // Canvas object added (from AI via HTTP API)
      if (msg.type === 'canvas_object_added' && msg.fromAI) {
        const obj = msg.object as ServerCanvasObject;
        setServerObjects(prev => [...prev, obj]);
        console.log('[App] Canvas object added:', obj.id);
      }

      // Canvas object modified
      if (msg.type === 'canvas_object_modified' && msg.fromAI) {
        const obj = msg.object as ServerCanvasObject;
        setServerObjects(prev => prev.map(o => o.id === obj.id ? obj : o));
        console.log('[App] Canvas object modified:', obj.id);
      }

      // Canvas object deleted
      if (msg.type === 'canvas_object_deleted' && msg.fromAI) {
        const id = msg.id as string;
        setServerObjects(prev => prev.filter(o => o.id !== id));
        console.log('[App] Canvas object deleted:', id);
      }

      // Canvas cleared
      if (msg.type === 'canvas_clear' && msg.fromAI) {
        setServerObjects([]);
        whiteboardRef.current?.clear();
        console.log('[App] Canvas cleared');
      }

      // Diagram elements (from visualization tools like create_mindmap, create_flow)
      if (msg.type === 'diagram_elements') {
        const skeletons = msg.elements as DiagramSkeleton[];
        const diagramType = msg.diagramType as string;
        whiteboardRef.current?.handleDiagramElements(skeletons, diagramType);
        console.log('[App] Diagram elements received:', diagramType, skeletons.length);
      }

      // Session state update (from server)
      if (msg.type === 'session_state_update') {
        updateSessionFromServer({
          phase: msg.phase as DiamondPhase,
          diamond: msg.diamond as 1 | 2,
          turnCount: msg.turnCount as number,
          currentTechnique: msg.currentTechnique as 'mindmap' | 'matrix' | 'affinity' | 'flow'
        });
        console.log('[App] Session state updated:', msg.phase, 'D' + msg.diamond);
      }

      // External notes edit (from file watcher)
      if (msg.type === 'notes_external_edit') {
        setNotes(msg.content as string);
        console.log('[App] Notes externally edited, added lines:', (msg.addedLines as string[])?.length || 0);
      }

      // Diagram update (from AI via MCP tools)
      if (msg.type === 'diagram_update') {
        const diagram: Diagram = {
          id: msg.id as string,
          diagramType: msg.diagramType as Diagram['diagramType'],
          code: msg.code as string,
          title: msg.title as string | undefined,
          theme: msg.theme as string | undefined,
        };

        setDiagrams(prev => {
          // Check if diagram already exists (update) or is new (create)
          const existingIndex = prev.findIndex(d => d.id === diagram.id);
          if (existingIndex >= 0) {
            // Update existing
            const updated = [...prev];
            updated[existingIndex] = diagram;
            console.log('[App] Diagram updated:', diagram.id);
            return updated;
          } else {
            // Add new
            console.log('[App] Diagram added:', diagram.id);
            return [...prev, diagram];
          }
        });
      }
    },
  });

  // Fetch initial canvas state when connected
  useEffect(() => {
    if (isConnected) {
      fetch('/api/canvas')
        .then(res => res.json())
        .then(data => {
          if (data.objects && data.objects.length > 0) {
            setServerObjects(data.objects);
            console.log('[App] Loaded', data.objects.length, 'initial canvas objects');
          }
        })
        .catch(err => console.error('[App] Failed to fetch canvas:', err));

      fetch('/api/notes')
        .then(res => res.json())
        .then(data => {
          if (data.content) {
            setNotes(data.content);
            console.log('[App] Loaded initial notes');
          }
        })
        .catch(err => console.error('[App] Failed to fetch notes:', err));

      fetch('/api/diagrams')
        .then(res => res.json())
        .then(data => {
          if (data.diagrams && data.diagrams.length > 0) {
            setDiagrams(data.diagrams);
            console.log('[App] Loaded', data.diagrams.length, 'initial diagrams');
          }
        })
        .catch(err => console.error('[App] Failed to fetch diagrams:', err));
    }
  }, [isConnected]);

  const handleNotesChange = useCallback((content: string) => {
    setNotes(content);
    send({ type: 'notes_edit', content });
  }, [send]);

  // Forward canvas edits to server for AI awareness
  const handleUserCanvasEdit = useCallback((edit: CanvasEdit) => {
    send({
      type: 'user_canvas_edit',
      editType: edit.type,
      elementIds: edit.elementIds,
      description: edit.description
    });
    console.log('[App] Forwarded canvas edit to server:', edit.description);
  }, [send]);

  const handleSend = useCallback(async (
    message: string,
    options: { includeWhiteboard: boolean; includeNotes: boolean }
  ) => {
    // Get current preferences
    const preferences = usePreferencesStore.getState().getPreferences();

    // Build the message payload
    const payload: {
      type: string;
      message: string;
      whiteboard?: string;
      notes?: string;
      preferences?: typeof preferences;
    } = {
      type: 'user_input',
      message,
      preferences,  // Include preferences so AI can read them
    };

    // Capture whiteboard if requested
    if (options.includeWhiteboard && whiteboardRef.current) {
      const imageData = await whiteboardRef.current.exportAsImage();
      if (imageData) {
        payload.whiteboard = imageData;
      }
    }

    // Include notes if requested
    if (options.includeNotes) {
      payload.notes = notes;
    }

    send(payload);
  }, [send, notes]);

  // Session indicator component
  const SessionIndicator = () => {
    const phaseLabels: Record<DiamondPhase, string> = {
      discover: 'Exploring',
      define: 'Focusing',
      develop: 'Generating',
      deliver: 'Finalizing'
    };
    const mode = (sessionPhase === 'discover' || sessionPhase === 'develop') ? 'Diverge' : 'Converge';

    return (
      <div className="session-indicator">
        <span className="diamond">D{sessionDiamond}</span>
        <span className="phase">{phaseLabels[sessionPhase]}</span>
        <span className="mode">{mode}</span>
        <span className="turn">T{sessionTurnCount}</span>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Live Canvas</h1>
        <span className="subtitle">Interactive Brainstorm</span>
        <div className="status">
          <div className={`status-dot ${isConnected ? 'connected' : ''}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <SessionIndicator />
        <SessionControls
          isConnected={socketIOConnected}
          roomCode={roomCode}
          isHost={isHost}
          sessionUrl={sessionUrl}
          onCreateSession={createSession}
          onJoinSession={joinSession}
          onLeaveSession={leaveSession}
        />
        <button
          className="settings-btn"
          onClick={() => setShowSettings(!showSettings)}
          title="Settings"
        >
          Settings
        </button>
      </header>

      {showSettings && (
        <div className="settings-panel">
          <div className="settings-header">
            <h3>Preferences</h3>
            <button className="close-btn" onClick={() => setShowSettings(false)}>X</button>
          </div>

          <label>
            <span>AI Proactivity</span>
            <select value={proactivity} onChange={e => setProactivity(e.target.value as typeof proactivity)}>
              <option value="low">Low (draw only when asked)</option>
              <option value="medium">Medium (balanced)</option>
              <option value="high">High (draw frequently)</option>
            </select>
          </label>

          <label>
            <span>Animation Speed</span>
            <select value={animationSpeed} onChange={e => setAnimationSpeed(e.target.value as typeof animationSpeed)}>
              <option value="instant">Instant</option>
              <option value="fast">Fast</option>
              <option value="smooth">Smooth</option>
            </select>
          </label>

          <label>
            <span>Default Complexity</span>
            <select value={defaultComplexity} onChange={e => setDefaultComplexity(e.target.value as typeof defaultComplexity)}>
              <option value="minimal">Minimal</option>
              <option value="moderate">Moderate</option>
              <option value="detailed">Detailed</option>
            </select>
          </label>

          <label>
            <span>Diagram Style</span>
            <select value={preferredDiagramStyle} onChange={e => setPreferredDiagramStyle(e.target.value as typeof preferredDiagramStyle)}>
              <option value="hand-drawn">Hand-drawn</option>
              <option value="clean">Clean</option>
            </select>
          </label>
        </div>
      )}

      <main className="main-content">
        <NotesPanel
          content={notes}
          onChange={handleNotesChange}
        />
        <WhiteboardPanel
          ref={whiteboardRef}
          serverObjects={serverObjects}
          onUserEdit={handleUserCanvasEdit}
          onCanvasChange={roomCode ? broadcastChanges : undefined}
        />
        <DiagramPanel diagrams={diagrams} />
        <InputArea onSend={handleSend} />
      </main>
    </div>
  );
}
