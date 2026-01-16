import { useState, useCallback, useRef } from 'react';
import { NotesPanel } from './components/NotesPanel';
import { WhiteboardPanel, WhiteboardPanelRef } from './components/WhiteboardPanel';
import { InputArea } from './components/InputArea';
import { useWebSocket } from './hooks/useWebSocket';

export default function App() {
  const [notes, setNotes] = useState('');
  const whiteboardRef = useRef<WhiteboardPanelRef>(null);

  const { isConnected, send } = useWebSocket({
    onMessage: (msg) => {
      if (msg.type === 'notes_sync' && msg.fromAI) {
        setNotes(msg.content as string);
      }
      // Whiteboard messages are handled internally by WhiteboardPanel
    },
  });

  const handleNotesChange = useCallback((content: string) => {
    setNotes(content);
    send({ type: 'notes_edit', content });
  }, [send]);

  const handleSend = useCallback(async (
    message: string,
    options: { includeWhiteboard: boolean; includeNotes: boolean }
  ) => {
    // Build the message payload
    const payload: {
      type: string;
      message: string;
      whiteboard?: string;
      notes?: string;
    } = {
      type: 'user_input',
      message,
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

  return (
    <div className="app-container">
      <header className="header">
        <h1>Live Canvas</h1>
        <span className="subtitle">Interactive Brainstorm</span>
        <div className="status">
          <div className={`status-dot ${isConnected ? 'connected' : ''}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      <main className="main-content">
        <NotesPanel
          content={notes}
          onChange={handleNotesChange}
        />
        <WhiteboardPanel ref={whiteboardRef} />
        <InputArea onSend={handleSend} />
      </main>
    </div>
  );
}
