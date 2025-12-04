import { Router } from 'express'

const router = Router()

// GET /api/agent/:os - Download agent binary
router.get('/:os', (req, res) => {
  const { os } = req.params

  if (!['windows', 'linux', 'macos'].includes(os)) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid OS. Use windows, linux, or macos',
    })
    return
  }

  // Agent binaries not yet available
  res.status(404).json({
    error: 'Not Found',
    message: `Agent binary for ${os} not found`,
  })
})

export default router
