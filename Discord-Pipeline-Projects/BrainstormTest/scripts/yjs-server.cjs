/**
 * Minimal Yjs WebSocket relay server.
 * Routes messages between clients in the same room.
 * The y-websocket client handles sync protocol — server just relays.
 */
'use strict'

const http = require('http')
const { WebSocketServer } = require('ws')

const PORT = parseInt(process.env.PORT || '1234', 10)

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const rooms = new Map()

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('yjs relay server ok')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const roomName = (req.url || '/').slice(1).split('?')[0] || 'default'

  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set())
  }
  const room = rooms.get(roomName)
  room.add(ws)

  ws.on('message', (data) => {
    // Relay to all other clients in the same room
    const message = data instanceof ArrayBuffer ? new Uint8Array(data) : data
    for (const client of room) {
      if (client !== ws && client.readyState === client.OPEN) {
        client.send(message, (err) => { if (err) console.error(err) })
      }
    }
  })

  ws.on('close', () => {
    room.delete(ws)
    if (room.size === 0) {
      rooms.delete(roomName)
    }
  })

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message)
  })
})

server.listen(PORT, () => {
  console.log(`yjs relay server running on port ${PORT}`)
})
