import { Router } from 'express'
import { randomUUID } from 'crypto'
import { getDatabase } from '../db/schema.js'
import path from 'path'
import fs from 'fs'

interface PipelineRow {
  id: string
  projectName: string
  projectPath: string
  currentPhase: string
  status: string
  createdAt: string
  updatedAt: string
}

const router = Router()

// GET /api/pipelines - List all pipelines
router.get('/', (_req, res) => {
  try {
    const db = getDatabase()
    const pipelines = db
      .prepare(
        `SELECT id, project_name as projectName, project_path as projectPath,
                current_phase as currentPhase, status, created_at as createdAt, updated_at as updatedAt
         FROM pipelines ORDER BY updated_at DESC`
      )
      .all()

    // Get phases for each pipeline
    const pipelinesWithPhases = (pipelines as PipelineRow[]).map((pipeline) => {
      const phases = db
        .prepare(
          `SELECT id, name, status, worker_id as workerId, worker_name as workerName,
                  started_at as startedAt, completed_at as completedAt
           FROM pipeline_phases WHERE pipeline_id = ? ORDER BY
           CASE name
             WHEN '0a' THEN 1
             WHEN '0b' THEN 2
             WHEN '1' THEN 3
             WHEN '2' THEN 4
             WHEN '3' THEN 5
           END`
        )
        .all(pipeline.id)
      return { ...pipeline, phases }
    })

    res.json(pipelinesWithPhases)
  } catch (err) {
    console.error('Error listing pipelines:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list pipelines',
    })
  }
})

// GET /api/pipelines/:id - Get pipeline details
router.get('/:id', (req, res) => {
  const { id } = req.params

  try {
    const db = getDatabase()
    const pipeline = db
      .prepare(
        `SELECT id, project_name as projectName, project_path as projectPath,
                current_phase as currentPhase, status, created_at as createdAt, updated_at as updatedAt
         FROM pipelines WHERE id = ?`
      )
      .get(id) as any

    if (!pipeline) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Pipeline not found',
      })
      return
    }

    // Get phases
    const phases = db
      .prepare(
        `SELECT id, name, status, worker_id as workerId, worker_name as workerName,
                started_at as startedAt, completed_at as completedAt
         FROM pipeline_phases WHERE pipeline_id = ? ORDER BY
         CASE name
           WHEN '0a' THEN 1
           WHEN '0b' THEN 2
           WHEN '1' THEN 3
           WHEN '2' THEN 4
           WHEN '3' THEN 5
         END`
      )
      .all(id)

    res.json({ ...pipeline, phases })
  } catch (err) {
    console.error('Error getting pipeline:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get pipeline',
    })
  }
})

// POST /api/pipelines - Create new pipeline
router.post('/', (req, res) => {
  const { projectPath, mode, startPhase, brainstormFile } = req.body

  // startFrom is an alias for startPhase (used by frontend)
  const startFrom = req.body.startFrom || startPhase

  if (!projectPath) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Project path required',
    })
    return
  }

  // Validate path format (must start with /)
  if (!projectPath.startsWith('/')) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Project path must be an absolute path',
    })
    return
  }

  try {
    const db = getDatabase()
    const id = randomUUID()
    const projectName = path.basename(projectPath)
    const phase = startFrom || '0a'

    // Create pipeline
    db.prepare(
      `INSERT INTO pipelines (id, project_name, project_path, current_phase, status)
       VALUES (?, ?, ?, ?, 'queued')`
    ).run(id, projectName, projectPath, phase)

    // Create initial phases
    const phases = ['0a', '0b', '1', '2', '3']
    const phaseIndex = phases.indexOf(phase)

    for (let i = 0; i < phases.length; i++) {
      const phaseName = phases[i]
      const status = i < phaseIndex ? 'complete' : i === phaseIndex ? 'pending' : 'pending'
      db.prepare(
        `INSERT INTO pipeline_phases (id, pipeline_id, name, status)
         VALUES (?, ?, ?, ?)`
      ).run(randomUUID(), id, phaseName, status)
    }

    // If brainstorm file is provided, save it to project's docs folder
    if (brainstormFile && brainstormFile.content) {
      const docsPath = path.join(projectPath, 'docs')

      try {
        // Create docs folder if it doesn't exist
        fs.mkdirSync(docsPath, { recursive: true })

        // Write brainstorm-notes.md
        const brainstormPath = path.join(docsPath, 'brainstorm-notes.md')
        const content = Buffer.from(brainstormFile.content, 'base64').toString('utf8')
        fs.writeFileSync(brainstormPath, content)
      } catch (fsErr) {
        console.error('Failed to save brainstorm file:', fsErr)
        // Continue anyway - pipeline created but file not saved
      }
    }

    // Fetch the created pipeline with phases
    const pipeline = db
      .prepare(
        `SELECT id, project_name as projectName, project_path as projectPath,
                current_phase as currentPhase, status, created_at as createdAt, updated_at as updatedAt
         FROM pipelines WHERE id = ?`
      )
      .get(id) as any

    const pipelinePhases = db
      .prepare(
        `SELECT id, name, status, worker_id as workerId, worker_name as workerName,
                started_at as startedAt, completed_at as completedAt
         FROM pipeline_phases WHERE pipeline_id = ?`
      )
      .all(id)

    res.status(201).json({ ...pipeline, phases: pipelinePhases, mode })
  } catch (err) {
    console.error('Error creating pipeline:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create pipeline',
    })
  }
})

// POST /api/pipelines/:id/stop - Stop pipeline
router.post('/:id/stop', (req, res) => {
  const { id } = req.params

  try {
    const db = getDatabase()
    const pipeline = db
      .prepare(`SELECT id, status FROM pipelines WHERE id = ?`)
      .get(id) as any

    if (!pipeline) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Pipeline not found',
      })
      return
    }

    if (pipeline.status === 'stopped') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Pipeline not running',
      })
      return
    }

    if (pipeline.status === 'complete') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Pipeline already complete',
      })
      return
    }

    // Update pipeline status
    db.prepare(
      `UPDATE pipelines SET status = 'stopped', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(id)

    res.json({ success: true, message: 'Pipeline stopped' })
  } catch (err) {
    console.error('Error stopping pipeline:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to stop pipeline',
    })
  }
})

// POST /api/pipelines/:id/signal - Signal phase completion
router.post('/:id/signal', (req, res) => {
  const { id } = req.params
  const { phase, testCounts } = req.body

  try {
    const db = getDatabase()
    const pipeline = db
      .prepare(`SELECT id, current_phase as currentPhase, status FROM pipelines WHERE id = ?`)
      .get(id) as any

    if (!pipeline) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Pipeline not found',
      })
      return
    }

    const targetPhase = phase || pipeline.currentPhase

    // Check if phase is already complete
    const pipelinePhase = db
      .prepare(`SELECT status FROM pipeline_phases WHERE pipeline_id = ? AND name = ?`)
      .get(id, targetPhase) as any

    if (pipelinePhase?.status === 'complete') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Phase already complete',
      })
      return
    }

    // Update phase to complete
    db.prepare(
      `UPDATE pipeline_phases SET status = 'complete', completed_at = CURRENT_TIMESTAMP
       WHERE pipeline_id = ? AND name = ?`
    ).run(id, targetPhase)

    // Determine next phase
    const phases = ['0a', '0b', '1', '2', '3']
    const currentIndex = phases.indexOf(targetPhase)
    const nextPhase = phases[currentIndex + 1]

    if (nextPhase) {
      // Update next phase to pending and update pipeline current_phase
      db.prepare(
        `UPDATE pipelines SET current_phase = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(nextPhase, id)
    } else {
      // Final phase - mark pipeline complete
      db.prepare(
        `UPDATE pipelines SET status = 'complete', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(id)
    }

    res.json({ success: true, phase: targetPhase, testCounts })
  } catch (err) {
    console.error('Error signaling phase:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to signal phase',
    })
  }
})

// DELETE /api/pipelines/:id - Delete pipeline
router.delete('/:id', (req, res) => {
  const { id } = req.params
  const { deleteFolder } = req.body || {}

  try {
    const db = getDatabase()
    const pipeline = db
      .prepare(`SELECT id, status, project_path as projectPath FROM pipelines WHERE id = ?`)
      .get(id) as any

    if (!pipeline) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Pipeline not found',
      })
      return
    }

    if (pipeline.status === 'in-progress') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Pipeline is running, stop first',
      })
      return
    }

    // Delete pipeline phases first (foreign key)
    db.prepare(`DELETE FROM pipeline_phases WHERE pipeline_id = ?`).run(id)

    // Delete pipeline
    db.prepare(`DELETE FROM pipelines WHERE id = ?`).run(id)

    // If deleteFolder is true, delete the project folder
    if (deleteFolder && pipeline.projectPath) {
      try {
        fs.rmSync(pipeline.projectPath, { recursive: true, force: true })
      } catch (fsErr) {
        console.error('Failed to delete project folder:', fsErr)
        // Pipeline already deleted, just warn about folder
      }
    }

    res.json({ success: true, message: 'Pipeline deleted', deleteFolder: !!deleteFolder })
  } catch (err) {
    console.error('Error deleting pipeline:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete pipeline',
    })
  }
})

// POST /api/pipelines/:id - Restart from phase
router.post('/:id', (req, res) => {
  const { id } = req.params
  const { fromPhase } = req.body

  try {
    const db = getDatabase()
    const pipeline = db
      .prepare(`SELECT id, status, project_path as projectPath FROM pipelines WHERE id = ?`)
      .get(id) as any

    if (!pipeline) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Pipeline not found',
      })
      return
    }

    if (pipeline.status === 'in-progress') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Stop pipeline first',
      })
      return
    }

    const phases = ['0a', '0b', '1', '2', '3']
    const startIndex = phases.indexOf(fromPhase)

    if (startIndex === -1) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid phase',
      })
      return
    }

    // Reset phases from the selected phase onwards
    for (let i = 0; i < phases.length; i++) {
      const phaseName = phases[i]
      const status = i < startIndex ? 'complete' : 'pending'
      db.prepare(
        `UPDATE pipeline_phases SET status = ?, started_at = NULL, completed_at = NULL, worker_id = NULL, worker_name = NULL
         WHERE pipeline_id = ? AND name = ?`
      ).run(status, id, phaseName)
    }

    // Update pipeline
    db.prepare(
      `UPDATE pipelines SET current_phase = ?, status = 'queued', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(fromPhase, id)

    res.json({ success: true, fromPhase })
  } catch (err) {
    console.error('Error restarting pipeline:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to restart pipeline',
    })
  }
})

// GET /api/pipelines/:id/analytics - Get pipeline analytics/metrics
router.get('/:id/analytics', (req, res) => {
  const { id } = req.params

  try {
    const db = getDatabase()
    const pipeline = db
      .prepare(
        `SELECT id, project_name as projectName, project_path as projectPath,
                current_phase as currentPhase, status, created_at as createdAt, updated_at as updatedAt
         FROM pipelines WHERE id = ?`
      )
      .get(id) as PipelineRow | undefined

    if (!pipeline) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Pipeline not found',
      })
      return
    }

    // Get phases with timing
    const phases = db
      .prepare(
        `SELECT name, status, started_at as startedAt, completed_at as completedAt
         FROM pipeline_phases WHERE pipeline_id = ? ORDER BY
         CASE name
           WHEN '0a' THEN 1
           WHEN '0b' THEN 2
           WHEN '1' THEN 3
           WHEN '2' THEN 4
           WHEN '3' THEN 5
         END`
      )
      .all(id) as { name: string; status: string; startedAt: string | null; completedAt: string | null }[]

    // Calculate metrics for each phase
    const phaseMetrics = phases.map((phase) => {
      let duration: number | null = null
      let cost: number | null = null

      if (phase.startedAt && phase.completedAt) {
        duration = new Date(phase.completedAt).getTime() - new Date(phase.startedAt).getTime()
        // Estimate cost: ~$0.01 per minute (based on Claude API usage)
        cost = Math.round((duration / 60000) * 0.01 * 100) / 100
      }

      return {
        name: phase.name,
        duration,
        cost,
        status: phase.status,
        error: undefined, // Could be added if we track errors
      }
    })

    // Calculate summary
    const completedPhases = phaseMetrics.filter((p) => p.status === 'complete')
    const totalDuration = completedPhases.reduce((sum, p) => sum + (p.duration || 0), 0)
    const totalCost = completedPhases.reduce((sum, p) => sum + (p.cost || 0), 0)

    // Mock test data (in real implementation, would read from manifest)
    const testData = {
      epics: [
        { name: 'Epic 1', passed: 11, total: 11 },
        { name: 'Epic 2', passed: 24, total: 24 },
        { name: 'Epic 3', passed: 16, total: 16 },
        { name: 'Epic 4', passed: 28, total: 28 },
      ],
    }

    const totalTests = testData.epics.reduce((sum, e) => sum + e.total, 0)
    const passedTests = testData.epics.reduce((sum, e) => sum + e.passed, 0)
    const testPassRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 1000) / 10 : 0

    const analytics = {
      summary: {
        totalDuration,
        estimatedCost: Math.round(totalCost * 100) / 100,
        testPassRate,
        phaseCount: phases.length,
      },
      phases: phaseMetrics,
      tests: testData,
    }

    res.json(analytics)
  } catch (err) {
    console.error('Error getting pipeline analytics:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get pipeline analytics',
    })
  }
})

// GET /api/pipelines/:id/decisions - Get decision log
router.get('/:id/decisions', (req, res) => {
  const { id } = req.params

  try {
    const db = getDatabase()
    const pipeline = db
      .prepare(`SELECT id FROM pipelines WHERE id = ?`)
      .get(id)

    if (!pipeline) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Pipeline not found',
      })
      return
    }

    // In a real implementation, decisions would be stored in a separate table
    // For now, we generate mock data based on phases
    const phases = db
      .prepare(
        `SELECT name, status, started_at as startedAt, completed_at as completedAt, worker_name as workerName
         FROM pipeline_phases WHERE pipeline_id = ? ORDER BY
         CASE name
           WHEN '0a' THEN 1
           WHEN '0b' THEN 2
           WHEN '1' THEN 3
           WHEN '2' THEN 4
           WHEN '3' THEN 5
         END`
      )
      .all(id) as { name: string; status: string; startedAt: string | null; completedAt: string | null; workerName: string | null }[]

    const entries: { timestamp: string; type: string; description: string }[] = []

    // Generate decision entries from phases
    phases.forEach((phase) => {
      if (phase.startedAt) {
        entries.push({
          timestamp: phase.startedAt,
          type: 'SPAWN',
          description: `Spawned worker for phase ${phase.name}`,
        })

        // Add heartbeats (every 5 minutes)
        if (phase.completedAt) {
          const startTime = new Date(phase.startedAt).getTime()
          const endTime = new Date(phase.completedAt).getTime()
          let heartbeatTime = startTime + 5 * 60 * 1000

          while (heartbeatTime < endTime) {
            entries.push({
              timestamp: new Date(heartbeatTime).toISOString(),
              type: 'HEARTBEAT',
              description: 'Supervisor heartbeat',
            })
            heartbeatTime += 5 * 60 * 1000
          }
        }
      }

      if (phase.completedAt && phase.status === 'complete') {
        entries.push({
          timestamp: phase.completedAt,
          type: 'PHASE_COMPLETE',
          description: `Phase ${phase.name} complete, advancing`,
        })
        entries.push({
          timestamp: new Date(new Date(phase.completedAt).getTime() + 1000).toISOString(),
          type: 'KILL',
          description: `Killed worker for phase ${phase.name}`,
        })
      }
    })

    // Sort by timestamp
    entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    res.json({
      entries,
      totalCount: entries.length,
    })
  } catch (err) {
    console.error('Error getting pipeline decisions:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get pipeline decisions',
    })
  }
})

// GET /api/pipelines/:id/history - Get historical runs
router.get('/:id/history', (req, res) => {
  const { id } = req.params

  try {
    const db = getDatabase()
    const pipeline = db
      .prepare(
        `SELECT id, project_path as projectPath, created_at as createdAt
         FROM pipelines WHERE id = ?`
      )
      .get(id) as { id: string; projectPath: string; createdAt: string } | undefined

    if (!pipeline) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Pipeline not found',
      })
      return
    }

    // In a real implementation, we would track runs in a separate table
    // For now, we look at the .pipeline/runs directory or return the current run
    const currentRun = {
      runId: pipeline.createdAt.replace(/[-:T]/g, '').slice(0, 15),
      date: pipeline.createdAt,
      duration: 10800000, // 3 hours mock
      cost: 12.50,
      status: 'complete',
    }

    res.json({
      runs: [currentRun],
      currentRunId: currentRun.runId,
    })
  } catch (err) {
    console.error('Error getting pipeline history:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get pipeline history',
    })
  }
})

// GET /api/pipelines/:id/runs/:runId - Get metrics for a specific run
router.get('/:id/runs/:runId', (req, res) => {
  const { id, runId: _runId } = req.params

  try {
    const db = getDatabase()
    const pipeline = db
      .prepare(`SELECT id FROM pipelines WHERE id = ?`)
      .get(id)

    if (!pipeline) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Pipeline not found',
      })
      return
    }

    // Return mock metrics for the run
    // In real implementation, would load from stored run data
    const metrics = {
      summary: {
        totalDuration: 14400000,
        estimatedCost: 15.0,
        testPassRate: 92.0,
        phaseCount: 5,
      },
      phases: [],
    }

    res.json(metrics)
  } catch (err) {
    console.error('Error getting run metrics:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get run metrics',
    })
  }
})

export default router
