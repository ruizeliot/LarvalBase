/**
 * Dashboard Colors Module
 *
 * ANSI escape codes for terminal coloring.
 * Provides consistent color palette across the dashboard.
 */

'use strict';

// ANSI escape code prefix
const ESC = '\x1b[';

// Reset all formatting
const RESET = `${ESC}0m`;

// Text colors (foreground)
const FG = {
  black: `${ESC}30m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  white: `${ESC}37m`,
  // Bright variants
  brightBlack: `${ESC}90m`,
  brightRed: `${ESC}91m`,
  brightGreen: `${ESC}92m`,
  brightYellow: `${ESC}93m`,
  brightBlue: `${ESC}94m`,
  brightMagenta: `${ESC}95m`,
  brightCyan: `${ESC}96m`,
  brightWhite: `${ESC}97m`
};

// Background colors
const BG = {
  black: `${ESC}40m`,
  red: `${ESC}41m`,
  green: `${ESC}42m`,
  yellow: `${ESC}43m`,
  blue: `${ESC}44m`,
  magenta: `${ESC}45m`,
  cyan: `${ESC}46m`,
  white: `${ESC}47m`,
  // Bright variants
  brightBlack: `${ESC}100m`,
  brightRed: `${ESC}101m`,
  brightGreen: `${ESC}102m`,
  brightYellow: `${ESC}103m`,
  brightBlue: `${ESC}104m`,
  brightMagenta: `${ESC}105m`,
  brightCyan: `${ESC}106m`,
  brightWhite: `${ESC}107m`
};

// Text styles
const STYLE = {
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  italic: `${ESC}3m`,
  underline: `${ESC}4m`,
  blink: `${ESC}5m`,
  inverse: `${ESC}7m`,
  hidden: `${ESC}8m`,
  strikethrough: `${ESC}9m`
};

// Semantic color functions
const colors = {
  // Status colors
  success: (text) => `${FG.brightGreen}${text}${RESET}`,
  error: (text) => `${FG.brightRed}${text}${RESET}`,
  warning: (text) => `${FG.brightYellow}${text}${RESET}`,
  info: (text) => `${FG.brightCyan}${text}${RESET}`,
  muted: (text) => `${FG.brightBlack}${text}${RESET}`,

  // Phase status colors
  pending: (text) => `${FG.brightBlack}${text}${RESET}`,
  running: (text) => `${FG.brightYellow}${STYLE.bold}${text}${RESET}`,
  complete: (text) => `${FG.brightGreen}${text}${RESET}`,
  failed: (text) => `${FG.brightRed}${text}${RESET}`,
  skipped: (text) => `${FG.brightBlack}${text}${RESET}`,

  // UI element colors
  header: (text) => `${FG.brightWhite}${STYLE.bold}${text}${RESET}`,
  label: (text) => `${FG.cyan}${text}${RESET}`,
  value: (text) => `${FG.white}${text}${RESET}`,
  highlight: (text) => `${FG.brightMagenta}${text}${RESET}`,
  accent: (text) => `${FG.brightBlue}${text}${RESET}`,

  // Cost display
  cost: (text) => `${FG.brightYellow}${text}${RESET}`,

  // Box drawing
  border: (text) => `${FG.brightBlack}${text}${RESET}`,

  // Key bindings
  key: (text) => `${FG.brightCyan}${STYLE.bold}${text}${RESET}`,

  // Custom color application
  apply: (color, text) => `${color}${text}${RESET}`,

  // Strip all ANSI codes (for length calculations)
  strip: (text) => text.replace(/\x1b\[[0-9;]*m/g, '')
};

// Status symbols
const SYMBOLS = {
  checkmark: '✓',
  cross: '✗',
  arrow: '▶',
  circle: '○',
  filledCircle: '●',
  spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  progressEmpty: '░',
  progressFilled: '█',
  lightning: '⚡'
};

// Box drawing characters
const BOX = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  teeLeft: '├',
  teeRight: '┤',
  teeDown: '┬',
  teeUp: '┴',
  cross: '┼'
};

module.exports = {
  RESET,
  FG,
  BG,
  STYLE,
  colors,
  SYMBOLS,
  BOX
};
