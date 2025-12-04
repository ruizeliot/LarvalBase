export interface Pipeline {
  id: string
  projectName: string
  projectPath: string
  currentPhase: string
  status: 'queued' | 'in-progress' | 'complete' | 'stopped' | 'failed'
  createdAt: string
  updatedAt: string
  phases: PipelinePhase[]
}

export interface PipelinePhase {
  id: string
  name: string
  status: 'pending' | 'in-progress' | 'complete' | 'failed'
  workerId?: string
  workerName?: string
  startedAt?: string
  completedAt?: string
}

export interface Worker {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'busy' | 'idle'
  cpu?: number
  ram?: number
  currentTask?: string
  connectedAt?: string
  lastHeartbeat?: string
}

export interface Token {
  id: string
  token: string
  createdAt: string
  usedBy?: string
  revoked: boolean
}

export interface AuthResponse {
  token: string
  expiresAt: string
}

export interface ApiError {
  error: string
  message: string
}
