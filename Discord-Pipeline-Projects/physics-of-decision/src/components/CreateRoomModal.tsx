import { useState, useEffect } from 'react';
import type { Room, Tag } from '../types';
import { TAGS, TAG_CONFIG } from '../types';

interface Props {
  room: Room | null;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; tags: string[]; isPrivate: boolean }) => void;
}

export default function CreateRoomModal({ room, onClose, onSubmit }: Props) {
  const [name, setName] = useState(room?.name || '');
  const [description, setDescription] = useState(room?.description || '');
  const [selectedTags, setSelectedTags] = useState<Set<Tag>>(new Set((room?.tags || []) as Tag[]));
  const [isPrivate, setIsPrivate] = useState(room?.isPrivate || false);

  useEffect(() => {
    if (room) {
      setName(room.name);
      setDescription(room.description);
      setSelectedTags(new Set(room.tags as Tag[]));
      setIsPrivate(room.isPrivate);
    }
  }, [room]);

  const isValid = name.trim().length >= 1 && name.trim().length <= 50;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      tags: [...selectedTags],
      isPrivate,
    });
  };

  const toggleTag = (tag: Tag) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h2>{room ? 'Modifier la Room' : 'Créer une Room'}</h2>

        <div className="form-group">
          <label className="form-label">Nom</label>
          <input
            className="form-input"
            placeholder="Ex: Analyse Flux Logistique"
            maxLength={50}
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <input
            className="form-input"
            placeholder="Courte description du projet..."
            maxLength={200}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tags</label>
          <div className="modal-tags">
            {TAGS.map(tag => {
              const cfg = TAG_CONFIG[tag];
              return (
                <button
                  key={tag}
                  className={`modal-tag${selectedTags.has(tag) ? ' selected' : ''}`}
                  style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
                  onClick={() => toggleTag(tag)}
                  type="button"
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <div className="toggle-row">
            <label className="form-label" style={{ margin: 0 }}>Room privée 🔒</label>
            <button
              className={`toggle${isPrivate ? ' on' : ''}`}
              onClick={() => setIsPrivate(!isPrivate)}
              type="button"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-confirm" disabled={!isValid} onClick={handleSubmit}>
            {room ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
