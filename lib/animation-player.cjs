#!/usr/bin/env node
// Animation Player - Reads JSON frames and plays with controls
// Usage: node animation-player.cjs <path-to-animation.json>
//
// Controls:
//   SPACE     - Play/Pause toggle
//   LEFT (←)  - Previous frame (when paused)
//   RIGHT (→) - Next frame (when paused)
//   Q/ESC     - Quit

const fs = require('fs');
const readline = require('readline');

// Get animation file from args
const animationFile = process.argv[2];

if (!animationFile) {
  console.error('Usage: node animation-player.cjs <animation.json>');
  process.exit(1);
}

// Read animation data
let animation;
try {
  const content = fs.readFileSync(animationFile, 'utf8');
  animation = JSON.parse(content);
} catch (err) {
  console.error(`Error reading animation file: ${err.message}`);
  process.exit(1);
}

// Validate
if (!animation.frames || !Array.isArray(animation.frames) || animation.frames.length === 0) {
  console.error('Invalid animation: must have frames array');
  process.exit(1);
}

// Config
const title = animation.title || 'Animation';
const level = animation.level || 1;
const frameDelay = animation.frameDelay || 500;
const frames = animation.frames;

let frameIndex = 0;
let loopCount = 0;
let isPlaying = true;
let playTimer = null;

// ANSI helpers
function clearScreen() {
  process.stdout.write('\x1B[2J\x1B[H');
}

function hideCursor() {
  process.stdout.write('\x1B[?25l');
}

function showCursor() {
  process.stdout.write('\x1B[?25h');
}

// Colors
const c = {
  reset: '\x1B[0m',
  cyan: '\x1B[36m',
  yellow: '\x1B[33m',
  green: '\x1B[32m',
  red: '\x1B[31m',
  gray: '\x1B[90m',
  white: '\x1B[97m',
  bold: '\x1B[1m',
  dim: '\x1B[2m',
};

function render() {
  clearScreen();

  const frame = frames[frameIndex];
  const art = frame.art || frame;
  const caption = frame.caption || '';

  // Header
  console.log(c.cyan + '━'.repeat(70) + c.reset);
  console.log(c.cyan + c.bold + '  ' + title + c.reset);
  console.log(c.gray + '  Level ' + level + ' Animation' + c.reset);
  console.log(c.cyan + '━'.repeat(70) + c.reset);
  console.log();

  // Frame content
  if (typeof art === 'string') {
    const lines = art.split('\n');
    lines.forEach(line => {
      console.log(c.white + '  ' + line + c.reset);
    });
  }

  console.log();

  // Caption
  if (caption) {
    console.log(c.yellow + '  ' + caption + c.reset);
  }

  console.log();

  // Progress bar
  const barWidth = 50;
  const progress = Math.round((frameIndex / (frames.length - 1)) * barWidth);
  const bar = '█'.repeat(progress) + '░'.repeat(barWidth - progress);
  console.log(c.gray + '  [' + c.cyan + bar + c.gray + ']' + c.reset);
  console.log();

  // Status & Controls
  console.log(c.gray + '━'.repeat(70) + c.reset);

  const status = isPlaying
    ? c.green + '▶ PLAYING' + c.reset
    : c.yellow + '⏸ PAUSED' + c.reset;

  console.log(
    '  ' + status +
    c.gray + '  |  Frame ' + c.white + (frameIndex + 1) + '/' + frames.length +
    c.gray + '  |  Loop ' + c.white + (loopCount + 1) + c.reset
  );

  console.log();
  console.log(c.dim + '  Controls: ' + c.reset +
    c.cyan + '[SPACE]' + c.gray + ' Play/Pause  ' +
    c.cyan + '[←][→]' + c.gray + ' Prev/Next  ' +
    c.cyan + '[Q]' + c.gray + ' Quit' + c.reset
  );
}

function nextFrame() {
  frameIndex++;
  if (frameIndex >= frames.length) {
    frameIndex = 0;
    loopCount++;
  }
  render();
}

function prevFrame() {
  frameIndex--;
  if (frameIndex < 0) {
    frameIndex = frames.length - 1;
    if (loopCount > 0) loopCount--;
  }
  render();
}

function togglePlay() {
  isPlaying = !isPlaying;
  if (isPlaying) {
    startPlayback();
  } else {
    stopPlayback();
  }
  render();
}

function startPlayback() {
  if (playTimer) clearInterval(playTimer);
  playTimer = setInterval(() => {
    if (isPlaying) {
      nextFrame();
    }
  }, frameDelay);
}

function stopPlayback() {
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
}

function quit() {
  stopPlayback();
  showCursor();
  clearScreen();
  console.log(c.green + '\n  Animation closed.\n' + c.reset);
  process.exit(0);
}

// Setup keyboard input
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on('keypress', (str, key) => {
  if (!key) return;

  // Quit
  if (key.name === 'q' || key.name === 'escape' || (key.ctrl && key.name === 'c')) {
    quit();
    return;
  }

  // Play/Pause
  if (key.name === 'space') {
    togglePlay();
    return;
  }

  // Frame control (only when paused)
  if (!isPlaying) {
    if (key.name === 'left') {
      prevFrame();
    } else if (key.name === 'right') {
      nextFrame();
    }
  }
});

// Handle exit signals
process.on('SIGINT', quit);
process.on('SIGTERM', quit);

// Start
hideCursor();
render();
startPlayback();
