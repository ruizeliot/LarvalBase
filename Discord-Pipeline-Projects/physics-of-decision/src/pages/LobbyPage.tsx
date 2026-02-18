import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useSocket } from '../hooks/useSocket';
import RoomCard from '../components/RoomCard';
import CreateRoomModal from '../components/CreateRoomModal';
import type { Room, Tag } from '../types';
import { TAGS, TAG_CONFIG } from '../types';

const FAVORITES_KEY = 'pod-favorites';

function loadFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(favs: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]));
}

type SortMode = 'activity' | 'date' | 'name';

export default function LobbyPage() {
  const { user, logout } = useUser();
  const socket = useSocket();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<Set<Tag>>(new Set());
  const [sort, setSort] = useState<SortMode>('activity');
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [showCreate, setShowCreate] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [favCollapsed, setFavCollapsed] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Socket.io connection
  useEffect(() => {
    if (!user) return;

    socket.emit('lobby:join', user);

    const handleRoomList = (roomList: Room[]) => setRooms(roomList);
    const handleCreated = (room: Room) => setRooms(prev => [room, ...prev]);
    const handleUpdated = (room: Room) => setRooms(prev => prev.map(r => r.id === room.id ? room : r));
    const handleDeleted = ({ roomId }: { roomId: string }) => setRooms(prev => prev.filter(r => r.id !== roomId));
    const handlePresence = ({ roomId, users }: { roomId: string; users: Room['users'] }) => {
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, users } : r));
    };

    socket.on('room:list', handleRoomList);
    socket.on('room:created', handleCreated);
    socket.on('room:updated', handleUpdated);
    socket.on('room:deleted', handleDeleted);
    socket.on('room:presence', handlePresence);

    return () => {
      socket.off('room:list', handleRoomList);
      socket.off('room:created', handleCreated);
      socket.off('room:updated', handleUpdated);
      socket.off('room:deleted', handleDeleted);
      socket.off('room:presence', handlePresence);
      socket.emit('lobby:leave');
    };
  }, [socket, user]);

  // Also fetch via REST as fallback
  useEffect(() => {
    fetch('/api/rooms')
      .then(r => r.json())
      .then(setRooms)
      .catch(() => {});
  }, []);

  const toggleFavorite = useCallback((roomId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      saveFavorites(next);
      return next;
    });
  }, []);

  const handleDelete = useCallback(async (roomId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette room ?')) return;
    const res = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
    if (res.ok) {
      setRooms(prev => prev.filter(r => r.id !== roomId));
    }
  }, []);

  const handleEdit = useCallback((room: Room) => {
    setEditRoom(room);
    setShowCreate(true);
  }, []);

  const handleCreate = useCallback(async (data: { name: string; description: string; tags: string[]; isPrivate: boolean }) => {
    if (editRoom) {
      const res = await fetch(`/api/rooms/${editRoom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setRooms(prev => prev.map(r => r.id === editRoom.id ? updated : r));
      }
    } else {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          creator: user!.username,
          creatorColor: user!.color,
          creatorAvatar: user!.avatar,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setRooms(prev => [created, ...prev]);
      }
    }
    setShowCreate(false);
    setEditRoom(null);
  }, [editRoom, user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Filter & Sort
  const query = debouncedSearch.toLowerCase();
  let filtered = rooms.filter(r => {
    if (query && !r.name.toLowerCase().includes(query) && !r.description.toLowerCase().includes(query)) {
      return false;
    }
    if (activeTags.size > 0) {
      for (const tag of activeTags) {
        if (!r.tags.includes(tag)) return false;
      }
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    // activity: most recently updated first, then by presence count as tiebreaker
    const timeDiff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    return timeDiff !== 0 ? timeDiff : b.users.length - a.users.length;
  });

  const favRooms = sorted.filter(r => favorites.has(r.id));
  const hasFavs = favRooms.length > 0;

  const toggleTag = (tag: Tag) => {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  if (!user) return null;

  return (
    <div className="lobby-view">
      {/* Header */}
      <header className="lobby-header">
        <div className="header-left">
          <span className="header-title">POD</span>
        </div>
        <div className="header-user">
          <button className="btn-logout" onClick={handleLogout} title="Se déconnecter">
            Déconnexion
          </button>
          <span className="user-name">{user.username}</span>
          <div className="user-avatar" style={{ background: user.color }}>
            {user.avatar}
          </div>
        </div>
      </header>

      <div className="lobby-content">
        {/* Controls bar */}
        <div className="controls-bar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Rechercher une room..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="sort-select"
            value={sort}
            onChange={e => setSort(e.target.value as SortMode)}
          >
            <option value="activity">Tri : Activité</option>
            <option value="date">Tri : Date</option>
            <option value="name">Tri : Nom</option>
          </select>
          <button className="btn-create" onClick={() => { setEditRoom(null); setShowCreate(true); }}>
            + Créer une Room
          </button>
        </div>

        {/* Tag filters */}
        <div className="tag-filter">
          <button
            className={`tag-chip${activeTags.size === 0 ? ' active' : ''}`}
            style={{
              background: 'rgba(0,0,0,0.04)',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border)',
            }}
            onClick={() => setActiveTags(new Set())}
          >
            Tout
          </button>
          {TAGS.map(tag => {
            const cfg = TAG_CONFIG[tag];
            return (
              <button
                key={tag}
                className={`tag-chip${activeTags.has(tag) ? ' active' : ''}`}
                style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
                onClick={() => toggleTag(tag)}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Favorites section */}
        {hasFavs && (
          <div className="room-section">
            <button
              className="section-title section-title-btn"
              onClick={() => setFavCollapsed(!favCollapsed)}
            >
              ⭐ Mes Rooms <span className="count">{favRooms.length}</span>
              <span className={`collapse-arrow${favCollapsed ? ' collapsed' : ''}`}>▼</span>
            </button>
            {!favCollapsed && (
              <div className="room-list">
                {favRooms.map(r => (
                  <RoomCard
                    key={r.id}
                    room={r}
                    isFavorite={true}
                    isOwner={r.creator === user.username}
                    onToggleFavorite={() => toggleFavorite(r.id)}
                    onDelete={() => handleDelete(r.id)}
                    onEdit={() => handleEdit(r)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* All rooms */}
        <div className="room-section">
          <div className="section-title">
            🌐 Toutes les Rooms <span className="count">{sorted.length}</span>
          </div>
          <div className="room-list">
            {sorted.length === 0 ? (
              <div className="empty-state">Aucune room trouvée</div>
            ) : (
              sorted.map(r => (
                <RoomCard
                  key={r.id}
                  room={r}
                  isFavorite={favorites.has(r.id)}
                  isOwner={r.creator === user.username}
                  onToggleFavorite={() => toggleFavorite(r.id)}
                  onDelete={() => handleDelete(r.id)}
                  onEdit={() => handleEdit(r)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit modal */}
      {showCreate && (
        <CreateRoomModal
          room={editRoom}
          onClose={() => { setShowCreate(false); setEditRoom(null); }}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
