import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePipelineStore } from '../stores/pipelineStore'
import { getPipelines, createPipeline, deletePipeline } from '../services/api'
import type { Pipeline } from '../types'

export default function PipelinesListPage() {
  const navigate = useNavigate()
  const { pipelines, setPipelines } = usePipelineStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newPipeline, setNewPipeline] = useState({
    projectPath: '',
    mode: 'new' as 'new' | 'feature',
    startPhase: '0a',
  })

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    pipeline: Pipeline | null
    deleteFolder: boolean
    error: string
  }>({ pipeline: null, deleteFolder: false, error: '' })

  // Drag-drop state
  const [brainstormFile, setBrainstormFile] = useState<{
    name: string
    size: number
    content: string
  } | null>(null)
  const [dropzoneError, setDropzoneError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadPipelines()
  }, [])

  const loadPipelines = async () => {
    try {
      const data = await getPipelines()
      setPipelines(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipelines')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const payload: Record<string, unknown> = {
        projectPath: newPipeline.projectPath,
        mode: newPipeline.mode,
        startFrom: newPipeline.startPhase,
      }

      // Include brainstorm file if present
      if (brainstormFile) {
        payload.brainstormFile = {
          name: brainstormFile.name,
          content: brainstormFile.content, // Already base64 encoded
        }
      }

      await createPipeline(payload as any)
      setShowNewForm(false)
      setNewPipeline({ projectPath: '', mode: 'new', startPhase: '0a' })
      setBrainstormFile(null)
      await loadPipelines()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pipeline')
    }
  }

  // Delete pipeline handler
  const handleDelete = async () => {
    if (!deleteModal.pipeline) return

    try {
      await deletePipeline(deleteModal.pipeline.id, deleteModal.deleteFolder)
      setDeleteModal({ pipeline: null, deleteFolder: false, error: '' })
      await loadPipelines()
    } catch (err) {
      setDeleteModal({
        ...deleteModal,
        error: err instanceof Error ? err.message : 'Failed to delete pipeline',
      })
    }
  }

  // Drag-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setDropzoneError('')

    const files = e.dataTransfer.files
    if (files.length === 0) return

    const file = files[0]
    processFile(file)
  }, [])

  const processFile = (file: File) => {
    // Check if it's a markdown file
    if (!file.name.endsWith('.md')) {
      setDropzoneError('Only .md files accepted')
      return
    }

    // Read file content
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      // Encode as base64
      const base64Content = btoa(unescape(encodeURIComponent(content)))
      setBrainstormFile({
        name: file.name,
        size: file.size,
        content: base64Content,
      })
      // Auto-set phase to 0b when brainstorm file is added
      setNewPipeline((prev) => ({ ...prev, startPhase: '0b' }))
      setDropzoneError('')
    }
    reader.readAsText(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const handleRemoveFile = () => {
    setBrainstormFile(null)
    setNewPipeline((prev) => ({ ...prev, startPhase: '0a' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  const getStatusBadge = (status: Pipeline['status']) => {
    const styles: Record<string, string> = {
      queued: 'bg-yellow-900 text-yellow-300',
      'in-progress': 'bg-blue-900 text-blue-300',
      complete: 'bg-green-900 text-green-300',
      stopped: 'bg-gray-700 text-gray-300',
      failed: 'bg-red-900 text-red-300',
    }
    return styles[status] || styles.queued
  }

  if (loading) {
    return <div className="text-center py-12">Loading pipelines...</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pipelines</h1>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          data-testid="start-pipeline"
        >
          Start New Pipeline
        </button>
      </div>

      {/* New Pipeline Form */}
      {showNewForm && (
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Project Path
              </label>
              <input
                type="text"
                value={newPipeline.projectPath}
                onChange={(e) =>
                  setNewPipeline({ ...newPipeline, projectPath: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                placeholder="/home/user/project"
                data-testid="project-path"
              />
            </div>

            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mode</label>
                <select
                  value={newPipeline.mode}
                  onChange={(e) =>
                    setNewPipeline({
                      ...newPipeline,
                      mode: e.target.value as 'new' | 'feature',
                    })
                  }
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                  data-testid="mode-select"
                >
                  <option value="new">New Project</option>
                  <option value="feature">Feature Mode</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Phase
                </label>
                <select
                  value={newPipeline.startPhase}
                  onChange={(e) =>
                    setNewPipeline({ ...newPipeline, startPhase: e.target.value })
                  }
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                  data-testid="phase-select"
                >
                  <option value="0a">0a</option>
                  <option value="0b">0b</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
            </div>

            {/* Drag-drop zone for brainstorm notes */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Brainstorm Notes (optional)
              </label>
              <div
                data-testid="brainstorm-dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md"
                  onChange={handleFileInput}
                  className="hidden"
                  data-testid="brainstorm-file-input"
                />
                {brainstormFile ? (
                  <div
                    className="flex items-center justify-between"
                    data-testid="file-preview"
                  >
                    <span>
                      {brainstormFile.name} ({formatFileSize(brainstormFile.size)})
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveFile()
                      }}
                      className="text-red-400 hover:text-red-300 px-2"
                      data-testid="file-remove"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    Drop brainstorm-notes.md here or click to browse
                  </div>
                )}
              </div>
              {dropzoneError && (
                <div
                  className="text-red-400 text-sm mt-1"
                  data-testid="dropzone-error"
                >
                  {dropzoneError}
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-400 text-sm" data-testid="error">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                data-testid="create-pipeline"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pipelines List */}
      {pipelines.length === 0 ? (
        <div className="text-center py-12 text-gray-400" data-testid="empty-state">
          No pipelines found
        </div>
      ) : (
        <div className="space-y-2" data-testid="pipelines-list">
          {pipelines.map((pipeline) => (
            <div
              key={pipeline.id}
              className="bg-gray-800 p-4 rounded-lg hover:bg-gray-750 flex items-center justify-between"
              data-testid={`pipeline-${pipeline.id}`}
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => navigate(`/pipeline/${pipeline.id}`)}
              >
                <h3 className="font-medium">{pipeline.projectName}</h3>
                <p className="text-sm text-gray-400">{pipeline.projectPath}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400">Phase: {pipeline.currentPhase}</span>
                <span
                  className={`px-2 py-1 rounded text-sm ${getStatusBadge(
                    pipeline.status
                  )}`}
                >
                  {pipeline.status}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteModal({ pipeline, deleteFolder: false, error: '' })
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                  data-testid={`delete-pipeline-${pipeline.id}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.pipeline && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          data-testid="delete-modal"
        >
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Delete Pipeline</h2>
            <p className="mb-2">
              Are you sure you want to delete pipeline:{' '}
              <strong>{deleteModal.pipeline.projectName}</strong>?
            </p>
            <p className="text-gray-400 text-sm mb-4">
              {deleteModal.pipeline.projectPath}
            </p>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="delete-folder"
                checked={deleteModal.deleteFolder}
                onChange={(e) =>
                  setDeleteModal({ ...deleteModal, deleteFolder: e.target.checked })
                }
                className="w-4 h-4"
                data-testid="delete-folder-checkbox"
              />
              <label htmlFor="delete-folder" className="text-sm">
                Also delete project folder on disk
              </label>
            </div>
            <p className="text-red-400 text-sm mb-4">
              Warning: This action cannot be undone.
            </p>
            {deleteModal.error && (
              <div
                className="text-red-400 text-sm mb-4"
                data-testid="delete-error"
              >
                {deleteModal.error}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() =>
                  setDeleteModal({ pipeline: null, deleteFolder: false, error: '' })
                }
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                data-testid="cancel-delete"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                data-testid="confirm-delete"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
