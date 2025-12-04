import { Router } from 'express'
import { generateToken } from '../middleware/auth.js'

const router = Router()

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin'

// POST /api/auth - Login
router.post('/', (req, res) => {
  const { password } = req.body

  if (!password) {
    res.status(400).json({ error: 'Bad Request', message: 'Password required' })
    return
  }

  if (password !== DASHBOARD_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid password' })
    return
  }

  const token = generateToken('admin')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  res.json({ token, expiresAt })
})

// POST /api/auth/logout - Logout (optional endpoint)
router.post('/logout', (_req, res) => {
  // JWT is stateless, client just removes token
  res.json({ success: true })
})

export default router
