const path = require('path');
const { spawn } = require('child_process');

// Path to the built Tauri application
const appPath = path.resolve(__dirname, '../src-tauri/target/release/counter-desktop-app.exe');

// Path to edgedriver from npm package
const edgedriverPath = path.resolve(__dirname, 'node_modules/.bin/edgedriver.cmd');

let tauriDriver;

exports.config = {
  runner: 'local',
  port: 4444,
  hostname: '127.0.0.1',
  specs: ['./specs/**/*.e2e.js'],
  maxInstances: 1,

  capabilities: [{
    maxInstances: 1,
    'tauri:options': {
      application: appPath,
    },
  }],

  logLevel: 'info',
  bail: 0,
  baseUrl: 'tauri://localhost',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },

  // Start tauri-driver before tests
  onPrepare: function () {
    return new Promise((resolve, reject) => {
      console.log('Starting tauri-driver with edgedriver...');

      const cmd = `tauri-driver --native-driver "${edgedriverPath}"`;
      tauriDriver = spawn(cmd, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      tauriDriver.stdout.on('data', (data) => {
        console.log(`tauri-driver: ${data}`);
      });

      tauriDriver.stderr.on('data', (data) => {
        console.error(`tauri-driver error: ${data}`);
      });

      tauriDriver.on('error', (err) => {
        console.error('Failed to start tauri-driver:', err);
        reject(err);
      });

      // Give tauri-driver time to start
      setTimeout(() => {
        console.log('tauri-driver started');
        resolve();
      }, 3000);
    });
  },

  // Stop tauri-driver after tests
  onComplete: function () {
    if (tauriDriver) {
      console.log('Stopping tauri-driver...');
      tauriDriver.kill();
    }
  },
};
