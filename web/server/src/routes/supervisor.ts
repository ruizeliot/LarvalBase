import { Router } from 'express'

const router = Router()

// POST /api/supervisor/send - Send message to supervisor
router.post('/send', (req, res) => {
  const { message } = req.body

  if (!message || typeof message !== 'string') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Message is required',
    })
    return
  }

  try {
    // In a real implementation, this would send to the supervisor tmux session
    // For now, just acknowledge the request
    res.json({
      success: true,
      message: 'Message sent to supervisor',
    })
  } catch (err) {
    console.error('Error sending to supervisor:', err)
    res.status(500).json({
      error: 'Internal Error',
      message: 'Supervisor not connected',
    })
  }
})

// POST /api/supervisor/nudge - Send nudge to supervisor
router.post('/nudge', (_req, res) => {
  try {
    // In a real implementation, this would send a nudge/continue message
    // to the supervisor tmux session
    res.json({
      success: true,
      message: 'Nudge sent to supervisor',
    })
  } catch (err) {
    console.error('Error nudging supervisor:', err)
    res.status(500).json({
      error: 'Internal Error',
      message: 'Failed to nudge supervisor',
    })
  }
})

export default router
