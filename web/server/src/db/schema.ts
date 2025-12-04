import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '../../db/pipeline-gui.db')

let db: Database.Database

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
  }
  return db
}

export function initDatabase(): void {
  const database = getDatabase()

  // Pipelines table
  database.exec(`
    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY,
      project_name TEXT NOT NULL,
      project_path TEXT NOT NULL,
      current_phase TEXT NOT NULL DEFAULT '0a',
      status TEXT NOT NULL DEFAULT 'queued',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Pipeline phases table
  database.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_phases (
      id TEXT PRIMARY KEY,
      pipeline_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      worker_id TEXT,
      worker_name TEXT,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
    )
  `)

  // Workers table
  database.exec(`
    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'disconnected',
      cpu REAL,
      ram REAL,
      current_task TEXT,
      connected_at TEXT,
      last_heartbeat TEXT
    )
  `)

  // Tokens table
  database.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      used_by TEXT,
      revoked INTEGER NOT NULL DEFAULT 0
    )
  `)
}
