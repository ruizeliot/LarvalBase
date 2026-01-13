/**
 * Dashboard Layout Module
 *
 * Layout calculations and box drawing for terminal UI.
 */

'use strict';

const { colors, BOX } = require('./colors.cjs');

// Default terminal dimensions
const DEFAULT_WIDTH = 80;
const MIN_WIDTH = 60;
const MAX_WIDTH = 120;

/**
 * Get terminal dimensions
 * @returns {{ width: number, height: number }}
 */
function getTerminalSize() {
  const width = process.stdout.columns || DEFAULT_WIDTH;
  const height = process.stdout.rows || 24;

  return {
    width: Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH),
    height
  };
}

/**
 * Create a horizontal line
 * @param {number} width - Line width
 * @param {string} char - Character to use (default: horizontal box)
 * @returns {string}
 */
function horizontalLine(width, char = BOX.horizontal) {
  return colors.border(char.repeat(width));
}

/**
 * Create a box top border
 * @param {number} width - Total width including corners
 * @returns {string}
 */
function boxTop(width) {
  return colors.border(
    BOX.topLeft + BOX.horizontal.repeat(width - 2) + BOX.topRight
  );
}

/**
 * Create a box bottom border
 * @param {number} width - Total width including corners
 * @returns {string}
 */
function boxBottom(width) {
  return colors.border(
    BOX.bottomLeft + BOX.horizontal.repeat(width - 2) + BOX.bottomRight
  );
}

/**
 * Create a box row with content
 * @param {string} content - Content to put in the row
 * @param {number} width - Total width including borders
 * @returns {string}
 */
function boxRow(content, width) {
  const stripped = colors.strip(content);
  const padding = width - stripped.length - 4; // 2 for borders, 2 for spacing
  const paddingStr = padding > 0 ? ' '.repeat(padding) : '';

  return colors.border(BOX.vertical) + ' ' + content + paddingStr + ' ' + colors.border(BOX.vertical);
}

/**
 * Create a box separator (internal horizontal line)
 * @param {number} width - Total width
 * @returns {string}
 */
function boxSeparator(width) {
  return colors.border(
    BOX.teeLeft + BOX.horizontal.repeat(width - 2) + BOX.teeRight
  );
}

/**
 * Pad string to width
 * @param {string} text - Text to pad
 * @param {number} width - Target width
 * @param {string} align - Alignment ('left', 'center', 'right')
 * @returns {string}
 */
function pad(text, width, align = 'left') {
  const stripped = colors.strip(text);
  const diff = width - stripped.length;

  if (diff <= 0) return text;

  switch (align) {
    case 'center':
      const left = Math.floor(diff / 2);
      const right = diff - left;
      return ' '.repeat(left) + text + ' '.repeat(right);
    case 'right':
      return ' '.repeat(diff) + text;
    case 'left':
    default:
      return text + ' '.repeat(diff);
  }
}

/**
 * Truncate string to width with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} width - Max width
 * @returns {string}
 */
function truncate(text, width) {
  const stripped = colors.strip(text);

  if (stripped.length <= width) return text;

  // Simple truncation (doesn't preserve ANSI codes)
  return stripped.substring(0, width - 3) + '...';
}

/**
 * Create a progress bar
 * @param {number} current - Current value
 * @param {number} total - Total value
 * @param {number} width - Bar width in characters
 * @returns {string}
 */
function progressBar(current, total, width = 20) {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;

  const bar = colors.success('█'.repeat(filled)) + colors.muted('░'.repeat(empty));
  const percent = Math.round((current / total) * 100);

  return `${bar} ${percent}%`;
}

/**
 * Create a column layout
 * @param {Array<{ content: string, width: number }>} columns - Column definitions
 * @param {string} separator - Separator between columns
 * @returns {string}
 */
function columns(cols, separator = '  ') {
  return cols.map((col, i) => {
    const padded = pad(col.content, col.width);
    return i < cols.length - 1 ? padded + separator : padded;
  }).join('');
}

/**
 * Create header row with title and stats
 * @param {string} title - Main title
 * @param {Array<string>} stats - Stats to display on right
 * @param {number} width - Total width
 * @returns {string}
 */
function headerRow(title, stats, width) {
  const statsStr = stats.join(' │ ');
  const statsStripped = colors.strip(statsStr);
  const titleWidth = width - statsStripped.length - 6; // borders, separators, padding

  return boxRow(
    pad(title, titleWidth) + colors.border(' │ ') + statsStr,
    width
  );
}

module.exports = {
  DEFAULT_WIDTH,
  MIN_WIDTH,
  MAX_WIDTH,
  getTerminalSize,
  horizontalLine,
  boxTop,
  boxBottom,
  boxRow,
  boxSeparator,
  pad,
  truncate,
  progressBar,
  columns,
  headerRow
};
