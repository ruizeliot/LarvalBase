const helpers = require('./test-helpers.cjs');

// Init protected PIDs
const protected = helpers.initProtectedPids();
console.log('Protected PIDs:', protected);

// Create test project
const testProject = helpers.createTestProject('spawn-check');
console.log('Test project:', testProject.projectPath);

// Spawn worker MINIMIZED (like actual tests)
console.log('\n>>> Spawning MINIMIZED worker (like test suite)...');
const worker = helpers.spawnRealWorker(testProject.projectPath, '/test-e2e-quick', {
  title: 'Test-Worker-Spawn',  // Same title as test suite
  minimized: true  // Same as test suite
});

console.log('>>> Worker object created, waiting...');

// Check every second
let checks = 0;
const interval = setInterval(() => {
  checks++;
  const pids = helpers.getClaudePids();
  const newPids = pids.filter(p => !protected.includes(p));
  console.log(`Check ${checks}: Claude PIDs = ${pids.join(', ')} | New PIDs = ${newPids.join(', ') || 'none'} | worker.pid = ${worker.pid}`);

  if (checks >= 10) {
    clearInterval(interval);
    console.log('\n>>> Cleaning up...');
    worker.cleanup();
    helpers.closeE2ETestWindows();
    testProject.cleanup();
    console.log('>>> Done');
    process.exit(0);
  }
}, 1000);
