import type { Room } from '../types';
import { TAG_CONFIG, DOT_COLORS, type Tag } from '../types';

interface Props {
  room: Room;
  isFavorite: boolean;
  isOwner: boolean;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function RoomCard({ room, isFavorite, isOwner, onToggleFavorite, onDelete, onEdit }: Props) {
  const maxDots = 5;
  const visibleUsers = room.users.slice(0, maxDots);
  const extraCount = Math.max(0, room.users.length - maxDots);

  return (
    <div className="room-card">
      <button
        className={`fav-btn${isFavorite ? ' active' : ''}`}
        onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
        title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        {isFavorite ? '★' : '☆'}
      </button>

      <div className="room-presence">
        <div className="presence-dots">
          {visibleUsers.map((u, i) => (
            <div
              key={i}
              className="presence-dot"
              style={{
                background: u.color || DOT_COLORS[i % DOT_COLORS.length],
                animationDelay: `${i * 0.3}s`,
              }}
              title={u.username}
            />
          ))}
        </div>
        <span className="presence-count">
          {room.users.length}{extraCount > 0 ? ` +${extraCount}` : ''}
        </span>
      </div>

      <div className="room-info">
        <div className="room-name-row">
          <span className="room-name">{room.name}</span>
          <span className={`room-badge ${room.isPrivate ? 'badge-private' : 'badge-public'}`}>
            {room.isPrivate ? '🔒 Privée' : '🌍 Public'}
          </span>
        </div>
        <div className="room-desc">{room.description}</div>
        <div className="room-meta">
          <div className="room-tags">
            {room.tags.map(tag => {
              const cfg = TAG_CONFIG[tag as Tag];
              if (!cfg) return null;
              return (
                <span
                  key={tag}
                  className="room-tag"
                  style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
                >
                  {cfg.label}
                </span>
              );
            })}
          </div>
          <span className="room-creator">par {room.creator}</span>
          <span className="room-date">{formatDate(room.createdAt)}</span>

          {isOwner && (
            <div className="room-actions">
              <button className="room-action-btn" onClick={e => { e.stopPropagation(); onEdit(); }}>
                ✏️ Modifier
              </button>
              <button className="room-action-btn danger" onClick={e => { e.stopPropagation(); onDelete(); }}>
                🗑️ Supprimer
              </button>
              {room.isPrivate && (
                <button className="room-action-btn" onClick={e => e.stopPropagation()}>
                  📨 Inviter
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
