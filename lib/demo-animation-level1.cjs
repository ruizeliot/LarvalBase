#!/usr/bin/env node
// Level 1: Simple Animation - Boxes and Arrows
// Demonstrates: "User drags node from palette to canvas"

const frames = [
  // Frame 1: Initial state
  `
    ┌─────────────────────────────────────────────────────────────┐
    │  LEVEL 1: Simple Animation                                  │
    │  User Story: "User drags node from palette to canvas"       │
    └─────────────────────────────────────────────────────────────┘

         Palette              Canvas
        ┌───────┐         ┌──────────────────┐
        │       │         │                  │
        │  [●]  │         │                  │
        │  [□]  │         │                  │
        │  [△]  │         │                  │
        │       │         │                  │
        └───────┘         └──────────────────┘

                    ▶ Starting...
  `,

  // Frame 2: Hover on node
  `
    ┌─────────────────────────────────────────────────────────────┐
    │  LEVEL 1: Simple Animation                                  │
    │  User Story: "User drags node from palette to canvas"       │
    └─────────────────────────────────────────────────────────────┘

         Palette              Canvas
        ┌───────┐         ┌──────────────────┐
        │       │         │                  │
        │ ▶[●]◀ │         │                  │
        │  [□]  │         │                  │
        │  [△]  │         │                  │
        │       │         │                  │
        └───────┘         └──────────────────┘

                    🖱️ Hover on node
  `,

  // Frame 3: Click/grab
  `
    ┌─────────────────────────────────────────────────────────────┐
    │  LEVEL 1: Simple Animation                                  │
    │  User Story: "User drags node from palette to canvas"       │
    └─────────────────────────────────────────────────────────────┘

         Palette              Canvas
        ┌───────┐         ┌──────────────────┐
        │       │         │                  │
        │ ╔[●]╗ │         │                  │
        │  [□]  │         │                  │
        │  [△]  │         │                  │
        │       │         │                  │
        └───────┘         └──────────────────┘

                    ✊ Click to grab
  `,

  // Frame 4: Start drag
  `
    ┌─────────────────────────────────────────────────────────────┐
    │  LEVEL 1: Simple Animation                                  │
    │  User Story: "User drags node from palette to canvas"       │
    └─────────────────────────────────────────────────────────────┘

         Palette              Canvas
        ┌───────┐         ┌──────────────────┐
        │       │         │                  │
        │ ┌···┐ │ [●]     │                  │
        │  [□]  │         │                  │
        │  [△]  │         │                  │
        │       │         │                  │
        └───────┘         └──────────────────┘

                    ↗️ Dragging...
  `,

  // Frame 5: Mid drag
  `
    ┌─────────────────────────────────────────────────────────────┐
    │  LEVEL 1: Simple Animation                                  │
    │  User Story: "User drags node from palette to canvas"       │
    └─────────────────────────────────────────────────────────────┘

         Palette              Canvas
        ┌───────┐         ┌──────────────────┐
        │       │         │                  │
        │ ┌···┐ │· · · ·[●]                  │
        │  [□]  │         │                  │
        │  [△]  │         │                  │
        │       │         │                  │
        └───────┘         └──────────────────┘

                    ➡️ Dragging...
  `,

  // Frame 6: Over canvas
  `
    ┌─────────────────────────────────────────────────────────────┐
    │  LEVEL 1: Simple Animation                                  │
    │  User Story: "User drags node from palette to canvas"       │
    └─────────────────────────────────────────────────────────────┘

         Palette              Canvas
        ┌───────┐         ┌──────────────────┐
        │       │         │                  │
        │ ┌···┐ │· · · · ·│· · · [●]         │
        │  [□]  │         │      ┌ ─ ─ ┐     │
        │  [△]  │         │      │     │     │
        │       │         │      └ ─ ─ ┘     │
        └───────┘         └──────────────────┘

                    📍 Drop zone highlighted
  `,

  // Frame 7: Release
  `
    ┌─────────────────────────────────────────────────────────────┐
    │  LEVEL 1: Simple Animation                                  │
    │  User Story: "User drags node from palette to canvas"       │
    └─────────────────────────────────────────────────────────────┘

         Palette              Canvas
        ┌───────┐         ┌──────────────────┐
        │       │         │                  │
        │  [●]  │         │                  │
        │  [□]  │         │       [●]        │
        │  [△]  │         │        ↓         │
        │       │         │                  │
        └───────┘         └──────────────────┘

                    ✋ Released!
  `,

  // Frame 8: Settled
  `
    ┌─────────────────────────────────────────────────────────────┐
    │  LEVEL 1: Simple Animation                                  │
    │  User Story: "User drags node from palette to canvas"       │
    └─────────────────────────────────────────────────────────────┘

         Palette              Canvas
        ┌───────┐         ┌──────────────────┐
        │       │         │                  │
        │  [●]  │         │      ╔═══╗       │
        │  [□]  │         │      ║ ● ║       │
        │  [△]  │         │      ╚═══╝       │
        │       │         │                  │
        └───────┘         └──────────────────┘

                    ✅ Node placed on canvas!
  `,

  // Frame 9: Success highlight
  `
    ┌─────────────────────────────────────────────────────────────┐
    │  LEVEL 1: Simple Animation                                  │
    │  User Story: "User drags node from palette to canvas"       │
    └─────────────────────────────────────────────────────────────┘

         Palette              Canvas
        ┌───────┐         ┌──────────────────┐
        │       │         │        ✨        │
        │  [●]  │         │      ╔═══╗       │
        │  [□]  │         │   ✨ ║ ● ║ ✨    │
        │  [△]  │         │      ╚═══╝       │
        │       │         │        ✨        │
        └───────┘         └──────────────────┘

                    🎉 Animation Complete!
  `
];

let frameIndex = 0;
let loopCount = 0;
const maxLoops = Infinity;

function clearScreen() {
  process.stdout.write('\x1B[2J\x1B[H');
}

function hideCursor() {
  process.stdout.write('\x1B[?25l');
}

function showCursor() {
  process.stdout.write('\x1B[?25h');
}

function render() {
  clearScreen();

  // Header
  console.log('\x1B[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1B[0m');
  console.log('\x1B[36m  Phase 1 Animation Demo - Prototype                              \x1B[0m');
  console.log('\x1B[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1B[0m');

  // Frame content
  console.log('\x1B[33m' + frames[frameIndex] + '\x1B[0m');

  // Footer
  console.log('\x1B[90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1B[0m');
  console.log(`\x1B[90m  Frame ${frameIndex + 1}/${frames.length} | Loop ${loopCount + 1}/${maxLoops} | Press Ctrl+C to exit\x1B[0m`);

  frameIndex++;

  if (frameIndex >= frames.length) {
    frameIndex = 0;
    loopCount++;

    if (loopCount >= maxLoops) {
      clearScreen();
      console.log('\n\x1B[32m  ✓ Level 1 Animation complete!\x1B[0m\n');
      showCursor();
      setTimeout(() => process.exit(0), 2000);
      return;
    }
  }

  // Slower for readability
  setTimeout(render, 600);
}

process.on('SIGINT', () => {
  showCursor();
  console.log('\n\x1B[0m');
  process.exit(0);
});

hideCursor();
render();
