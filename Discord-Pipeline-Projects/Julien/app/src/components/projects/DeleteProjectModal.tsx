import './Modal.css';

interface DeleteProjectModalProps {
  isOpen: boolean;
  projectName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteProjectModal({ isOpen, projectName, onClose, onConfirm }: DeleteProjectModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Supprimer le projet</h2>
        <p className="modal__text">
          Voulez-vous vraiment supprimer le projet <strong>{projectName}</strong> ?
          Cette action est irreversible.
        </p>
        <div className="modal__actions">
          <button className="modal__btn modal__btn--secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="modal__btn modal__btn--danger" onClick={handleConfirm}>
            Confirmer la suppression
          </button>
        </div>
      </div>
    </div>
  );
}
