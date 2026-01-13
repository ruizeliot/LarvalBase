/**
 * Manifest File I/O Operations
 *
 * Provides atomic read/write operations for manifest files.
 * Includes backup functionality and error recovery.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { validate } = require('./validate.cjs');

const MANIFEST_FILENAME = 'manifest.json';
const MANIFEST_DIR = '.pipeline';
const BACKUP_SUFFIX = '.backup';

/**
 * Get the full path to the manifest file
 * @param {string} projectPath - Path to the project directory
 * @returns {string}
 */
function getManifestPath(projectPath) {
  return path.join(projectPath, MANIFEST_DIR, MANIFEST_FILENAME);
}

/**
 * Get the full path to the manifest backup file
 * @param {string} projectPath - Path to the project directory
 * @returns {string}
 */
function getBackupPath(projectPath) {
  return path.join(projectPath, MANIFEST_DIR, MANIFEST_FILENAME + BACKUP_SUFFIX);
}

/**
 * Ensure the .pipeline directory exists
 * @param {string} projectPath - Path to the project directory
 */
function ensureDirectory(projectPath) {
  const dirPath = path.join(projectPath, MANIFEST_DIR);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Read manifest from project directory
 * @param {string} projectPath - Path to the project directory
 * @returns {Object} The manifest object
 * @throws {Error} If file doesn't exist or is invalid JSON
 */
function read(projectPath) {
  const manifestPath = getManifestPath(projectPath);

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }

  const content = fs.readFileSync(manifestPath, 'utf8');

  try {
    const manifest = JSON.parse(content);
    return manifest;
  } catch (err) {
    throw new Error(`Invalid JSON in manifest: ${err.message}`);
  }
}

/**
 * Read manifest with fallback to backup
 * @param {string} projectPath - Path to the project directory
 * @returns {Object} The manifest object
 * @throws {Error} If neither primary nor backup exists
 */
function readWithFallback(projectPath) {
  const manifestPath = getManifestPath(projectPath);
  const backupPath = getBackupPath(projectPath);

  // Try primary first
  if (fs.existsSync(manifestPath)) {
    try {
      return read(projectPath);
    } catch (err) {
      console.error(`Primary manifest corrupted: ${err.message}`);
    }
  }

  // Try backup
  if (fs.existsSync(backupPath)) {
    console.log('Reading from backup manifest...');
    const content = fs.readFileSync(backupPath, 'utf8');
    const manifest = JSON.parse(content);

    // Restore backup to primary
    fs.writeFileSync(manifestPath, content, 'utf8');
    console.log('Restored manifest from backup');

    return manifest;
  }

  throw new Error(`No manifest found at ${manifestPath} (no backup available)`);
}

/**
 * Write manifest to project directory with atomic write
 * @param {string} projectPath - Path to the project directory
 * @param {Object} manifest - The manifest object to write
 * @param {{ validate: boolean, backup: boolean }} options - Write options
 * @throws {Error} If validation fails or write fails
 */
function write(projectPath, manifest, options = {}) {
  const { validate: shouldValidate = true, backup = true } = options;

  // Validate before writing
  if (shouldValidate) {
    const result = validate(manifest);
    if (!result.valid) {
      throw new Error(`Invalid manifest: ${result.errors.join('; ')}`);
    }
  }

  // Update timestamp
  manifest.updatedAt = new Date().toISOString();

  ensureDirectory(projectPath);

  const manifestPath = getManifestPath(projectPath);
  const backupPath = getBackupPath(projectPath);
  const tempPath = manifestPath + '.tmp';

  // Backup existing manifest
  if (backup && fs.existsSync(manifestPath)) {
    fs.copyFileSync(manifestPath, backupPath);
  }

  // Atomic write: write to temp, then rename
  const content = JSON.stringify(manifest, null, 2);

  try {
    // Write to temp file
    fs.writeFileSync(tempPath, content, 'utf8');

    // Rename temp to actual (atomic on most filesystems)
    fs.renameSync(tempPath, manifestPath);
  } catch (err) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw new Error(`Failed to write manifest: ${err.message}`);
  }
}

/**
 * Check if manifest exists in project
 * @param {string} projectPath - Path to the project directory
 * @returns {boolean}
 */
function exists(projectPath) {
  return fs.existsSync(getManifestPath(projectPath));
}

/**
 * Delete manifest and backup (for testing/reset)
 * @param {string} projectPath - Path to the project directory
 */
function remove(projectPath) {
  const manifestPath = getManifestPath(projectPath);
  const backupPath = getBackupPath(projectPath);

  if (fs.existsSync(manifestPath)) {
    fs.unlinkSync(manifestPath);
  }
  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }
}

module.exports = {
  MANIFEST_FILENAME,
  MANIFEST_DIR,
  getManifestPath,
  getBackupPath,
  ensureDirectory,
  read,
  readWithFallback,
  write,
  exists,
  remove
};
