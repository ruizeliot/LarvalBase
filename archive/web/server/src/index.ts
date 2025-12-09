import express from 'express'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import authRoutes from './routes/auth.js'
import pipelineRoutes from './routes/pipelines.js'
import workerRoutes from './routes/workers.js'
import tokenRoutes from './routes/tokens.js'
import coordinatorRoutes from './routes/coordinator.js'
import supervisorRoutes from './routes/supervisor.js'
import agentRoutes from './routes/agent.js'
import { authMiddleware } from './middleware/auth.js'
import { initDatabase } from './db/schema.js'

const PORT = process.env.PORT || 3025

const app = express()
const server = createServer(app)

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const token = url.searchParams.get('token')

  if (!token) {
    ws.close(4001, 'No token provided')
    return
  }

  // Token validation would happen here

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      // Handle different message types based on message.type
    } catch (err) {
      console.error('WebSocket message error:', err)
    }
  })

  ws.on('close', () => {
    // Client disconnected
  })
})

// Middleware
app.use(cors())
app.use(express.json())

// Health check (no auth)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
  })
})

// Auth routes (no auth required)
app.use('/api/auth', authRoutes)

// Protected routes
app.use('/api/pipelines', authMiddleware, pipelineRoutes)
app.use('/api/workers', authMiddleware, workerRoutes)
app.use('/api/tokens', authMiddleware, tokenRoutes)
app.use('/api/coordinator', authMiddleware, coordinatorRoutes)
app.use('/api/supervisor', authMiddleware, supervisorRoutes)
app.use('/api/agent', agentRoutes) // Agent downloads don't need auth

// Initialize database and start server
initDatabase()

server.listen(PORT)
