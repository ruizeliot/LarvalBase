import { Router } from 'express'
import { getDatabase } from '../db/schema.js'

const router = Router()

// GET /api/workers - List all workers
router.get('/', (_req, res) => {
  try {
    const db = getDatabase()
    const workers = db
      .prepare(
        `SELECT id, name, status, cpu, ram, current_task as currentTask,
                connected_at as connectedAt, last_heartbeat as lastHeartbeat
         FROM workers ORDER BY name`
      )
      .all()

    res.json(workers)
  } catch (err) {
    console.error('Error listing workers:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list workers',
    })
  }
})

// DELETE /api/workers/:id - Remove worker
router.delete('/:id', (req, res) => {
  const { id } = req.params

  try {
    const db = getDatabase()
    const worker = db.prepare(`SELECT id FROM workers WHERE id = ?`).get(id) as any

    if (!worker) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Worker not found',
      })
      return
    }

    db.prepare(`DELETE FROM workers WHERE id = ?`).run(id)

    res.json({ success: true, message: 'Worker removed' })
  } catch (err) {
    console.error('Error removing worker:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove worker',
    })
  }
})

// POST /api/workers/:id/kill - Kill worker session
router.post('/:id/kill', (req, res) => {
  const { id } = req.params

  try {
    const db = getDatabase()
    const worker = db.prepare(`SELECT id, status FROM workers WHERE id = ?`).get(id) as any

    if (!worker) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Worker not found',
      })
      return
    }

    if (worker.status === 'disconnected') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Worker not connected',
      })
      return
    }

    // Update worker status to disconnected
    db.prepare(
      `UPDATE workers SET status = 'disconnected', current_task = NULL WHERE id = ?`
    ).run(id)

    res.json({ success: true, message: 'Worker session killed' })
  } catch (err) {
    console.error('Error killing worker:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to kill worker',
    })
  }
})

// POST /api/workers/:id/send - Send message to worker
router.post('/:id/send', (req, res) => {
  const { id } = req.params
  const { message } = req.body

  try {
    const db = getDatabase()
    const worker = db.prepare(`SELECT id, status FROM workers WHERE id = ?`).get(id) as any

    if (!worker) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Worker not found',
      })
      return
    }

    if (worker.status === 'disconnected') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Worker not connected',
      })
      return
    }

    // In a real implementation, this would send the message to the worker via WebSocket
    // For now, just acknowledge the request
    res.json({ success: true, message: 'Message sent to worker' })
  } catch (err) {
    console.error('Error sending to worker:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send message to worker',
    })
  }
})

export default router
