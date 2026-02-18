import { useEffect, useRef } from 'react';
import type { HITeCNodeType } from '../../types/hitec';

interface Props {
  x: number;
  y: number;
  view: 'structure' | 'causal';
  hasSelection: boolean;
  onAddNode: (type: HITeCNodeType) => void;
  onDelete: () => void;
  onLayout: (type: 'hierarchical' | 'radial' | 'force') => void;
  onClose: () => void;
}

export default function ContextMenu({ x, y, view, hasSelection, onAddNode, onDelete, onLayout, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const structureTypes: HITeCNodeType[] = ['complex', 'elementary'];
  const causalTypes: HITeCNodeType[] = ['component', 'potential', 'potentiality', 'actuality'];
  const types = view === 'structure' ? structureTypes : causalTypes;

  return (
    <div
      ref={ref}
      className="ctx-menu show"
      style={{ left: x, top: y }}
      onClick={e => e.stopPropagation()}
    >
      {types.map(t => (
        <div key={t} className="ctx-item" onClick={() => onAddNode(t)}>
          ➕ Ajouter {t}
        </div>
      ))}
      <div className="ctx-sep" />
      <div className="ctx-item" onClick={() => onLayout('hierarchical')}>🔽 Auto-layout</div>
      <div className="ctx-item" onClick={() => onLayout('radial')}>🔘 Radial</div>
      <div className="ctx-item" onClick={() => onLayout('force')}>💫 Force-directed</div>
      {hasSelection && (
        <>
          <div className="ctx-sep" />
          <div className="ctx-item danger" onClick={onDelete}>🗑 Supprimer</div>
        </>
      )}
    </div>
  );
}
