#!/usr/bin/env node
// ASCII Animation Demo - runs in its own terminal

const frames = [
  `
    ╔══════════════════════════════════════╗
    ║                                      ║
    ║      🚀                              ║
    ║                                      ║
    ║   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   ║
    ║                                      ║
    ╚══════════════════════════════════════╝
  `,
  `
    ╔══════════════════════════════════════╗
    ║                                      ║
    ║          🚀                          ║
    ║                                      ║
    ║   ▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   ║
    ║                                      ║
    ╚══════════════════════════════════════╝
  `,
  `
    ╔══════════════════════════════════════╗
    ║                                      ║
    ║              🚀                      ║
    ║                                      ║
    ║   ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░   ║
    ║                                      ║
    ╚══════════════════════════════════════╝
  `,
  `
    ╔══════════════════════════════════════╗
    ║                                      ║
    ║                  🚀                  ║
    ║                                      ║
    ║   ▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░   ║
    ║                                      ║
    ╚══════════════════════════════════════╝
  `,
  `
    ╔══════════════════════════════════════╗
    ║                                      ║
    ║                      🚀              ║
    ║                                      ║
    ║   ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░   ║
    ║                                      ║
    ╚══════════════════════════════════════╝
  `,
  `
    ╔══════════════════════════════════════╗
    ║                                      ║
    ║                          🚀          ║
    ║                                      ║
    ║   ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░   ║
    ║                                      ║
    ╚══════════════════════════════════════╝
  `,
  `
    ╔══════════════════════════════════════╗
    ║                                      ║
    ║                              🚀      ║
    ║                                      ║
    ║   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░   ║
    ║                                      ║
    ╚══════════════════════════════════════╝
  `,
  `
    ╔══════════════════════════════════════╗
    ║                                      ║
    ║                                  🚀  ║
    ║                                      ║
    ║   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░   ║
    ║                                      ║
    ╚══════════════════════════════════════╝
  `,
  `
    ╔══════════════════════════════════════╗
    ║                                    ✨║
    ║                                      ║
    ║                                      ║
    ║   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░   ║
    ║                                      ║
    ╚══════════════════════════════════════╝
  `,
  `
    ╔══════════════════════════════════════╗
    ║                                      ║
    ║         LAUNCH COMPLETE! 🎉          ║
    ║                                      ║
    ║   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ║
    ║                                      ║
    ╚══════════════════════════════════════╝
  `
];

// Spinner for waiting
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

let frameIndex = 0;
let spinnerIndex = 0;
let loopCount = 0;
const maxLoops = Infinity; // Loop forever!

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

  console.log('\x1B[36m'); // Cyan color
  console.log('  ┌─────────────────────────────────────────┐');
  console.log('  │   ASCII Animation Demo - Claude Code   │');
  console.log('  └─────────────────────────────────────────┘');
  console.log('\x1B[0m'); // Reset color

  console.log(frames[frameIndex]);

  console.log(`\n  \x1B[33m${spinnerFrames[spinnerIndex]}\x1B[0m Loop ${loopCount + 1}/${maxLoops} | Frame ${frameIndex + 1}/${frames.length}`);
  console.log('\n  \x1B[90mPress Ctrl+C to exit\x1B[0m');

  spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
  frameIndex++;

  if (frameIndex >= frames.length) {
    frameIndex = 0;
    loopCount++;

    if (loopCount >= maxLoops) {
      clearScreen();
      console.log('\n\x1B[32m  ✓ Animation complete! Window will close in 3 seconds...\x1B[0m\n');
      showCursor();
      setTimeout(() => process.exit(0), 3000);
      return;
    }
  }

  setTimeout(render, 200);
}

// Handle exit
process.on('SIGINT', () => {
  showCursor();
  console.log('\n\x1B[0m  Bye! 👋\n');
  process.exit(0);
});

// Start
hideCursor();
render();
