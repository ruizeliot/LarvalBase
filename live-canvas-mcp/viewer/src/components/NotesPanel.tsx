import { useCallback, useRef, useEffect } from 'react';

interface NotesPanelProps {
  content: string;
  onChange: (content: string) => void;
}

export function NotesPanel({ content, onChange }: NotesPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUserEditingRef = useRef(false);
  const debounceRef = useRef<number>();

  // Update textarea when content changes from server (AI)
  useEffect(() => {
    if (textareaRef.current && !isUserEditingRef.current) {
      textareaRef.current.value = content;
    }
  }, [content]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    isUserEditingRef.current = true;

    // Debounce the onChange call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      onChange(e.target.value);
      isUserEditingRef.current = false;
    }, 300);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    isUserEditingRef.current = false;
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        Notes
        <span className="hint">(syncs with docs/brainstorm-notes.md)</span>
      </div>
      <div className="panel-content">
        <textarea
          ref={textareaRef}
          className="notes-editor"
          placeholder={`Start typing notes here...

Both you and the AI can edit this.
Changes sync to docs/brainstorm-notes.md`}
          defaultValue={content}
          onChange={handleInput}
          onBlur={handleBlur}
        />
      </div>
    </div>
  );
}
