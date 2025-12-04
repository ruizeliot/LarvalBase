import { useAuthStore } from '../stores/authStore'
import type { AuthResponse, Pipeline, Worker, Token } from '../types'

// Use the same base URL as the app (handles /pipeline-gui-test/ prefix)
const basePath = import.meta.env.BASE_URL || '/'
const API_BASE = `${basePath}api`.replace(/\/+/g, '/')

async function fetchWithAuth<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    useAuthStore.getState().logout()
    window.location.href = `${basePath}login`.replace(/\/+/g, '/')
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || error.error || 'Request failed')
  }

  return response.json()
}

// Auth
export async function login(password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }))
    throw new Error(error.message || error.error || 'Invalid password')
  }

  return response.json()
}

// Pipelines
export async function getPipelines(): Promise<Pipeline[]> {
  return fetchWithAuth<Pipeline[]>('/pipelines')
}

export async function getPipeline(id: string): Promise<Pipeline> {
  return fetchWithAuth<Pipeline>(`/pipelines/${id}`)
}

export async function createPipeline(data: {
  projectPath: string
  mode: 'new' | 'feature'
  startPhase?: string
}): Promise<Pipeline> {
  return fetchWithAuth<Pipeline>('/pipelines', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function stopPipeline(id: string): Promise<void> {
  await fetchWithAuth<void>(`/pipelines/${id}/stop`, {
    method: 'POST',
  })
}

export async function signalPhase(
  id: string,
  phase: string,
  testCounts?: { passing: number; failing: number }
): Promise<void> {
  await fetchWithAuth<void>(`/pipelines/${id}/signal`, {
    method: 'POST',
    body: JSON.stringify({ phase, testCounts }),
  })
}

export async function restartFromPhase(id: string, phase: string): Promise<void> {
  await fetchWithAuth<void>(`/pipelines/${id}`, {
    method: 'POST',
    body: JSON.stringify({ fromPhase: phase }),
  })
}

export async function deletePipeline(id: string, deleteFolder: boolean = false): Promise<void> {
  await fetchWithAuth<void>(`/pipelines/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ deleteFolder }),
  })
}

// Workers
export async function getWorkers(): Promise<Worker[]> {
  return fetchWithAuth<Worker[]>('/workers')
}

export async function removeWorker(id: string): Promise<void> {
  await fetchWithAuth<void>(`/workers/${id}`, {
    method: 'DELETE',
  })
}

export async function killWorker(id: string): Promise<void> {
  await fetchWithAuth<void>(`/workers/${id}/kill`, {
    method: 'POST',
  })
}

// Tokens
export async function getTokens(): Promise<Token[]> {
  return fetchWithAuth<Token[]>('/tokens')
}

export async function generateToken(): Promise<Token> {
  return fetchWithAuth<Token>('/tokens', {
    method: 'POST',
  })
}

export async function revokeToken(id: string): Promise<void> {
  await fetchWithAuth<void>(`/tokens/${id}`, {
    method: 'DELETE',
  })
}

// Coordinator
export async function restartCoordinator(): Promise<void> {
  await fetchWithAuth<void>('/coordinator/restart', {
    method: 'POST',
  })
}

// Health
export async function getHealth(): Promise<{ status: string; uptime: number }> {
  return fetchWithAuth<{ status: string; uptime: number }>('/health')
}

// Analytics
export interface PipelineAnalytics {
  summary: {
    totalDuration: number
    estimatedCost: number
    testPassRate: number
    phaseCount: number
  }
  phases: {
    name: string
    duration: number | null
    cost: number | null
    status: string
    error?: string
  }[]
  tests: {
    epics: {
      name: string
      passed: number
      total: number
    }[]
  }
}

export interface DecisionEntry {
  timestamp: string
  type: string
  description: string
}

export interface DecisionsResponse {
  entries: DecisionEntry[]
  totalCount: number
}

export interface HistoryRun {
  runId: string
  date: string
  duration: number | null
  cost: number | null
  status: string
}

export interface HistoryResponse {
  runs: HistoryRun[]
  currentRunId: string | null
}

export async function getPipelineAnalytics(id: string): Promise<PipelineAnalytics> {
  return fetchWithAuth<PipelineAnalytics>(`/pipelines/${id}/analytics`)
}

export async function getPipelineDecisions(id: string): Promise<DecisionsResponse> {
  return fetchWithAuth<DecisionsResponse>(`/pipelines/${id}/decisions`)
}

export async function getPipelineHistory(id: string): Promise<HistoryResponse> {
  return fetchWithAuth<HistoryResponse>(`/pipelines/${id}/history`)
}

export async function getRunMetrics(
  id: string,
  runId: string
): Promise<{ summary: PipelineAnalytics['summary']; phases: PipelineAnalytics['phases'] }> {
  return fetchWithAuth(`/pipelines/${id}/runs/${runId}`)
}
