/**
 * CascadeSim y-websocket production server.
 * Relays Yjs WebSocket messages between clients in the same room.
 * Features: health endpoint, room garbage collection, connection limit.
 */
'use strict'

const http = require('http')
const { WebSocketServer } = require('ws')

const PORT = parseInt(process.env.PORT || '1234', 10)
const MAX_CONNECTIONS = parseInt(process.env.MAX_CONNECTIONS || '50', 10)
const ROOM_GC_INTERVAL_MS = 60_000 // check every minute
const ROOM_GC_TIMEOUT_MS = 5 * 60_000 // 5 minutes of inactivity

/** @type {Map<string, { clients: Set<import('ws').WebSocket>, lastActivity: number }>} */
const rooms = new Map()
let totalConnections = 0

const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size, connections: totalConnections }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('cascadesim y-websocket server')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  // Enforce connection limit
  if (totalConnections >= MAX_CONNECTIONS) {
    ws.close(1013, 'Max connections reached')
    return
  }

  totalConnections++
  const roomName = (req.url || '/').slice(1).split('?')[0] || 'default'

  if (!rooms.has(roomName)) {
    rooms.set(roomName, { clients: new Set(), lastActivity: Date.now() })
  }
  const room = rooms.get(roomName)
  room.clients.add(ws)
  room.lastActivity = Date.now()

  ws.on('message', (data) => {
    room.lastActivity = Date.now()
    const message = data instanceof ArrayBuffer ? new Uint8Array(data) : data
    for (const client of room.clients) {
      if (client !== ws && client.readyState === client.OPEN) {
        client.send(message, (err) => { if (err) console.error(err) })
      }
    }
  })

  ws.on('close', () => {
    totalConnections--
    room.clients.delete(ws)
    if (room.clients.size === 0) {
      // Mark last activity for GC timer (don't delete immediately)
      room.lastActivity = Date.now()
    }
  })

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message)
  })
})

// Room garbage collection: remove empty rooms after ROOM_GC_TIMEOUT_MS of inactivity
const gcInterval = setInterval(() => {
  const now = Date.now()
  for (const [name, room] of rooms) {
    if (room.clients.size === 0 && now - room.lastActivity >= ROOM_GC_TIMEOUT_MS) {
      rooms.delete(name)
    }
  }
}, ROOM_GC_INTERVAL_MS)

// Cleanup on shutdown
process.on('SIGTERM', () => {
  clearInterval(gcInterval)
  wss.close()
  server.close()
  process.exit(0)
})

process.on('SIGINT', () => {
  clearInterval(gcInterval)
  wss.close()
  server.close()
  process.exit(0)
})

server.listen(PORT, () => {
  console.log(`cascadesim y-websocket server running on port ${PORT} (max ${MAX_CONNECTIONS} connections)`)
})
