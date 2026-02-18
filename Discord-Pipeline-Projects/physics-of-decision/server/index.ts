import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json());

// ---------- In-memory state ----------

interface Room {
  id: string;
  name: string;
  description: string;
  tags: string[];
  isPrivate: boolean;
  creator: string;
  creatorColor: string;
  creatorAvatar: string;
  createdAt: string;
  updatedAt: string;
  users: { username: string; color: string; avatar: string; socketId: string }[];
}

const rooms: Map<string, Room> = new Map();

// Seed some demo rooms
const seedRooms: Omit<Room, 'users'>[] = [
  {
    id: uuidv4(), name: 'Analyse Système Énergétique',
    description: 'Modélisation des flux énergétiques et points de décision critiques pour la transition',
    tags: ['energie', 'systeme'], isPrivate: false, creator: 'Marie.L',
    creatorColor: '#ea580c', creatorAvatar: '🔬',
    createdAt: new Date('2026-02-14').toISOString(), updatedAt: new Date('2026-02-14').toISOString(),
  },
  {
    id: uuidv4(), name: 'Modèle Décisionnel RH',
    description: 'Cartographie des boucles de feedback dans le processus de recrutement',
    tags: ['rh', 'systeme'], isPrivate: false, creator: 'Alexis.M',
    creatorColor: '#0d9488', creatorAvatar: '⚛',
    createdAt: new Date('2026-02-13').toISOString(), updatedAt: new Date('2026-02-13').toISOString(),
  },
  {
    id: uuidv4(), name: 'Réseau Financier Simplifié',
    description: 'Graphe de dépendances entre KPIs financiers et leviers opérationnels',
    tags: ['finance'], isPrivate: false, creator: 'Sophie.A',
    creatorColor: '#7c3aed', creatorAvatar: '💡',
    createdAt: new Date('2026-02-12').toISOString(), updatedAt: new Date('2026-02-12').toISOString(),
  },
  {
    id: uuidv4(), name: 'Parcours Patient Urgences',
    description: 'Flux décisionnels aux urgences — identification des goulots',
    tags: ['sante', 'systeme'], isPrivate: true, creator: 'Dr.Faure',
    creatorColor: '#db2777', creatorAvatar: '🧬',
    createdAt: new Date('2026-02-11').toISOString(), updatedAt: new Date('2026-02-11').toISOString(),
  },
  {
    id: uuidv4(), name: 'Cursus Adaptatif L3 Info',
    description: "Modèle de parcours étudiant avec boucles d'évaluation",
    tags: ['education'], isPrivate: false, creator: 'Prof.Morel',
    creatorColor: '#059669', creatorAvatar: '🌐',
    createdAt: new Date('2026-02-10').toISOString(), updatedAt: new Date('2026-02-10').toISOString(),
  },
  {
    id: uuidv4(), name: 'Audit Chaîne Logistique',
    description: 'Analyse systémique de la supply chain — noeuds critiques et redondances',
    tags: ['systeme'], isPrivate: false, creator: 'Rémi.L',
    creatorColor: '#2563eb', creatorAvatar: '📡',
    createdAt: new Date('2026-02-09').toISOString(), updatedAt: new Date('2026-02-09').toISOString(),
  },
  {
    id: uuidv4(), name: 'Stratégie Produit 2025',
    description: 'Arbre de décision pour le roadmap produit et priorisation features',
    tags: ['systeme', 'finance'], isPrivate: true, creator: 'Alexis.M',
    creatorColor: '#0d9488', creatorAvatar: '⚛',
    createdAt: new Date('2026-02-08').toISOString(), updatedAt: new Date('2026-02-08').toISOString(),
  },
];

for (const seed of seedRooms) {
  rooms.set(seed.id, { ...seed, users: [] });
}

// ---------- REST API ----------

function roomToJSON(room: Room) {
  return {
    id: room.id,
    name: room.name,
    description: room.description,
    tags: room.tags,
    isPrivate: room.isPrivate,
    creator: room.creator,
    creatorColor: room.creatorColor,
    creatorAvatar: room.creatorAvatar,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    users: room.users.map(u => ({ username: u.username, color: u.color, avatar: u.avatar })),
  };
}

app.get('/api/rooms', (_req, res) => {
  res.json([...rooms.values()].map(roomToJSON));
});

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(roomToJSON(room));
});

app.post('/api/rooms', (req, res) => {
  const { name, description, tags, isPrivate, creator, creatorColor, creatorAvatar } = req.body;
  if (!name || name.length < 1 || name.length > 50) {
    return res.status(400).json({ error: 'Name required (1-50 chars)' });
  }
  const room: Room = {
    id: uuidv4(),
    name,
    description: description || '',
    tags: tags || [],
    isPrivate: !!isPrivate,
    creator: creator || 'Anonymous',
    creatorColor: creatorColor || '#0d9488',
    creatorAvatar: creatorAvatar || '⚛',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    users: [],
  };
  rooms.set(room.id, room);
  io.emit('room:created', roomToJSON(room));
  res.status(201).json(roomToJSON(room));
});

app.put('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const { name, description, tags, isPrivate } = req.body;
  if (name !== undefined) room.name = name;
  if (description !== undefined) room.description = description;
  if (tags !== undefined) room.tags = tags;
  if (isPrivate !== undefined) room.isPrivate = isPrivate;
  room.updatedAt = new Date().toISOString();
  io.emit('room:updated', roomToJSON(room));
  res.json(roomToJSON(room));
});

app.delete('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  rooms.delete(req.params.id);
  io.emit('room:deleted', { roomId: req.params.id });
  res.json({ success: true });
});

// ---------- Socket.io ----------

io.on('connection', (socket) => {
  let currentUser: { username: string; color: string; avatar: string } | null = null;

  socket.on('lobby:join', (user: { username: string; color: string; avatar: string }) => {
    currentUser = user;
    socket.join('lobby');
    // Send current room list
    socket.emit('room:list', [...rooms.values()].map(roomToJSON));
  });

  socket.on('lobby:leave', () => {
    socket.leave('lobby');
  });

  socket.on('room:join', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room || !currentUser) return;
    // Remove from any previous rooms
    for (const [, r] of rooms) {
      r.users = r.users.filter(u => u.socketId !== socket.id);
    }
    room.users.push({ ...currentUser, socketId: socket.id });
    socket.join(`room:${roomId}`);
    io.to('lobby').emit('room:presence', {
      roomId,
      users: room.users.map(u => ({ username: u.username, color: u.color, avatar: u.avatar })),
    });
  });

  socket.on('room:leave', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.users = room.users.filter(u => u.socketId !== socket.id);
    socket.leave(`room:${roomId}`);
    io.to('lobby').emit('room:presence', {
      roomId,
      users: room.users.map(u => ({ username: u.username, color: u.color, avatar: u.avatar })),
    });
  });

  socket.on('disconnect', () => {
    // Clean up user from all rooms
    for (const [roomId, room] of rooms) {
      const before = room.users.length;
      room.users = room.users.filter(u => u.socketId !== socket.id);
      if (room.users.length !== before) {
        io.to('lobby').emit('room:presence', {
          roomId,
          users: room.users.map(u => ({ username: u.username, color: u.color, avatar: u.avatar })),
        });
      }
    }
  });
});

// ---------- Start ----------

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[POD Server] listening on http://localhost:${PORT}`);
});
