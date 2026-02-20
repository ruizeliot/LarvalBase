import { useState } from 'react';
import './Modal.css';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Nouveau projet</h2>
        <form onSubmit={handleSubmit}>
          <div className="modal__field">
            <label htmlFor="project-name" className="modal__label">Nom du projet</label>
            <input
              id="project-name"
              type="text"
              className="modal__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mon projet ML..."
              autoFocus
            />
          </div>
          <div className="modal__actions">
            <button type="button" className="modal__btn modal__btn--secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="modal__btn modal__btn--primary">
              Creer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
