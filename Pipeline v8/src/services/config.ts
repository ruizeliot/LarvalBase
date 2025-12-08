/**
 * Config Service
 * Pipeline v8
 *
 * Application configuration management
 */
import type { AppConfig, RecentProject } from '../types/index.js';

/**
 * US-017: Load app config
 * SKELETON: Not implemented
 */
export async function loadConfig(): Promise<AppConfig> {
  // SKELETON: Not implemented
  throw new Error('Not implemented');
}

/**
 * US-017: Save app config
 * SKELETON: Not implemented
 */
export async function saveConfig(config: AppConfig): Promise<void> {
  // SKELETON: Not implemented
  throw new Error('Not implemented');
}

/**
 * US-017: Get recent projects
 * SKELETON: Not implemented
 */
export async function getRecentProjects(): Promise<RecentProject[]> {
  // SKELETON: Not implemented
  throw new Error('Not implemented');
}

/**
 * US-017: Add recent project
 * SKELETON: Not implemented
 */
export async function addRecentProject(project: RecentProject): Promise<void> {
  // SKELETON: Not implemented
  throw new Error('Not implemented');
}

/**
 * US-019: Get current working directory
 * SKELETON: Not implemented
 */
export function getCurrentDirectory(): string {
  // SKELETON: Not implemented
  throw new Error('Not implemented');
}
