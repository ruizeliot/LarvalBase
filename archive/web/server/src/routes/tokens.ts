import { Router } from 'express'
import { randomUUID, randomBytes } from 'crypto'
import { getDatabase } from '../db/schema.js'

const router = Router()

// Generate a secure random token
function generateSecureToken(): string {
  return randomBytes(32).toString('hex')
}

// GET /api/tokens - List all tokens
router.get('/', (_req, res) => {
  try {
    const db = getDatabase()
    const tokens = db
      .prepare(
        `SELECT id, token, created_at as createdAt, used_by as usedBy, revoked
         FROM tokens ORDER BY created_at DESC`
      )
      .all()

    // Convert revoked from integer to boolean
    const formattedTokens = (tokens as any[]).map((t) => ({
      ...t,
      revoked: Boolean(t.revoked),
    }))

    res.json(formattedTokens)
  } catch (err) {
    console.error('Error listing tokens:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list tokens',
    })
  }
})

// POST /api/tokens - Generate new token
router.post('/', (_req, res) => {
  try {
    const db = getDatabase()
    const id = randomUUID()
    const token = generateSecureToken()

    db.prepare(
      `INSERT INTO tokens (id, token) VALUES (?, ?)`
    ).run(id, token)

    // Fetch the created token
    const createdToken = db
      .prepare(
        `SELECT id, token, created_at as createdAt, used_by as usedBy, revoked
         FROM tokens WHERE id = ?`
      )
      .get(id) as any

    res.status(201).json({
      ...createdToken,
      revoked: Boolean(createdToken.revoked),
    })
  } catch (err) {
    console.error('Error generating token:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate token',
    })
  }
})

// DELETE /api/tokens/:id - Revoke token
router.delete('/:id', (req, res) => {
  const { id } = req.params

  try {
    const db = getDatabase()
    const token = db.prepare(`SELECT id FROM tokens WHERE id = ?`).get(id) as any

    if (!token) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Token not found',
      })
      return
    }

    // Mark token as revoked instead of deleting
    db.prepare(`UPDATE tokens SET revoked = 1 WHERE id = ?`).run(id)

    res.json({ success: true, message: 'Token revoked' })
  } catch (err) {
    console.error('Error revoking token:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to revoke token',
    })
  }
})

export default router
