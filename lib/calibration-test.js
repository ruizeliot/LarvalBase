const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

const TEST_PROJECT = 'C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/test-calibration';
const TRANSCRIPTS_DIR = 'C:/Users/ahunt/.claude/projects/C--Users-ahunt-Documents-IMT-Claude-Pipeline-Office-test-calibration';

// Fixed message size for consistent measurement
const MESSAGE_WORDS = 200;
const REQUESTED_OUTPUT_WORDS = 500;

// Generate consistent prompt
function generatePrompt(iteration) {
  const filler = [];
  const words = 'algorithm data structure complexity performance optimization software engineering development deployment integration testing distributed systems consensus protocol fault tolerance reliability machine learning neural network training'.split(' ');
  for (let i = 0; i < MESSAGE_WORDS; i++) {
    filler.push(words[i % words.length]);
  }

  return `${filler.join(' ')}

Message ${iteration}: Write exactly ${REQUESTED_OUTPUT_WORDS} words about software architecture patterns. Include microservices, monoliths, and event-driven design. Do NOT use any tools.`;
}

// Fetch current 5-hour usage
async function fetchUsage() {
  const credsPath = path.join(process.env.USERPROFILE, '.claude', '.credentials.json');
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/api/oauth/usage',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${creds.claudeAiOauth.accessToken}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'User-Agent': 'claude-code/2.0.32'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const usage = JSON.parse(data);
          resolve({
            fiveHour: usage.five_hour?.utilization || 0,
            sevenDay: usage.seven_day?.utilization || 0
          });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Analyze ALL transcripts and sum tokens
function sumAllTranscriptTokens() {
  if (!fs.existsSync(TRANSCRIPTS_DIR)) return 0;

  const files = fs.readdirSync(TRANSCRIPTS_DIR)
    .filter(f => f.endsWith('.jsonl') && !f.startsWith('agent-'));

  let total = 0;

  for (const file of files) {
    const filePath = path.join(TRANSCRIPTS_DIR, file);
    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.message && obj.message.usage) {
          const u = obj.message.usage;
          total += u.input_tokens || 0;
          total += u.output_tokens || 0;
          total += u.cache_read_input_tokens || 0;
          if (u.cache_creation) {
            total += (u.cache_creation.ephemeral_5m_input_tokens || 0);
            total += (u.cache_creation.ephemeral_1h_input_tokens || 0);
          } else if (u.cache_creation_input_tokens) {
            total += u.cache_creation_input_tokens;
          }
        }
      } catch {}
    }
  }

  return total;
}

// Run a single Claude message
async function runMessage(iteration) {
  const prompt = generatePrompt(iteration);

  return new Promise((resolve, reject) => {
    const claude = spawn('claude', ['-p', '--dangerously-skip-permissions'], {
      cwd: TEST_PROJECT,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let output = '';
    claude.stdout.on('data', d => { output += d.toString(); });
    claude.stderr.on('data', d => { output += d.toString(); });

    claude.on('close', code => {
      resolve({ code, outputLength: output.length });
    });
    claude.on('error', reject);

    claude.stdin.write(prompt);
    claude.stdin.end();
  });
}

async function main() {
  console.log('=== PRECISE CALIBRATION TEST ===\n');
  console.log('Strategy: Send messages until we cross TWO percentage boundaries');
  console.log('  - First boundary (N -> N+1): START measurement');
  console.log('  - Second boundary (N+1 -> N+2): END measurement');
  console.log('  - Tokens between = exact tokens per 1%\n');

  // Create test project
  if (!fs.existsSync(TEST_PROJECT)) {
    fs.mkdirSync(TEST_PROJECT, { recursive: true });
  }

  // Clear old transcripts
  if (fs.existsSync(TRANSCRIPTS_DIR)) {
    const oldFiles = fs.readdirSync(TRANSCRIPTS_DIR).filter(f => f.endsWith('.jsonl'));
    for (const f of oldFiles) {
      fs.unlinkSync(path.join(TRANSCRIPTS_DIR, f));
    }
    console.log('Cleared ' + oldFiles.length + ' old transcripts\n');
  }

  // Get initial usage
  let usage = await fetchUsage();
  const initialPercent = Math.floor(usage.fiveHour);
  console.log('Initial usage: ' + usage.fiveHour + '% (floor: ' + initialPercent + '%)');

  const firstBoundary = initialPercent + 1;
  const secondBoundary = initialPercent + 2;
  console.log('Target: Cross ' + firstBoundary + '% (START) then ' + secondBoundary + '% (END)\n');

  let iteration = 0;
  let startTokens = null;
  let startPercent = null;
  let crossedFirst = false;
  const maxIterations = 50;

  while (iteration < maxIterations) {
    iteration++;
    process.stdout.write('Msg #' + iteration + '... ');

    // Run message
    const result = await runMessage(iteration);
    process.stdout.write('done (' + result.outputLength + ' chars). ');

    // Wait for API to update
    await new Promise(r => setTimeout(r, 3000));

    // Check usage
    usage = await fetchUsage();
    const currentTokens = sumAllTranscriptTokens();
    console.log('Usage: ' + usage.fiveHour.toFixed(1) + '%, Tokens: ' + currentTokens.toLocaleString());

    // Check if we crossed first boundary
    if (!crossedFirst && usage.fiveHour >= firstBoundary) {
      crossedFirst = true;
      startTokens = currentTokens;
      startPercent = usage.fiveHour;
      console.log('\n>>> CROSSED FIRST BOUNDARY (' + firstBoundary + '%) <<<');
      console.log('>>> START: ' + startTokens.toLocaleString() + ' tokens at ' + startPercent.toFixed(2) + '%\n');
    }

    // Check if we crossed second boundary
    if (crossedFirst && usage.fiveHour >= secondBoundary) {
      const endTokens = currentTokens;
      const endPercent = usage.fiveHour;

      console.log('\n>>> CROSSED SECOND BOUNDARY (' + secondBoundary + '%) <<<');
      console.log('>>> END: ' + endTokens.toLocaleString() + ' tokens at ' + endPercent.toFixed(2) + '%\n');

      // Calculate
      const tokensDelta = endTokens - startTokens;
      const percentDelta = endPercent - startPercent;
      const tokensPerPercent = tokensDelta / percentDelta;

      console.log('=== CALIBRATION RESULTS ===');
      console.log('Start: ' + startTokens.toLocaleString() + ' tokens @ ' + startPercent.toFixed(2) + '%');
      console.log('End: ' + endTokens.toLocaleString() + ' tokens @ ' + endPercent.toFixed(2) + '%');
      console.log('Delta: ' + tokensDelta.toLocaleString() + ' tokens / ' + percentDelta.toFixed(2) + '%');
      console.log('\n*** TOKENS PER 1%: ' + Math.round(tokensPerPercent).toLocaleString() + ' ***');

      // Save result
      const result = {
        calibrationDate: new Date().toISOString(),
        tokensPerPercent: Math.round(tokensPerPercent),
        iterations: iteration,
        startTokens,
        startPercent,
        endTokens,
        endPercent,
        tokensDelta,
        percentDelta
      };
      fs.writeFileSync(
        path.join(TEST_PROJECT, 'calibration-result.json'),
        JSON.stringify(result, null, 2)
      );
      console.log('\nSaved to test-calibration/calibration-result.json');
      return;
    }
  }

  console.log('\nMax iterations reached without crossing both boundaries.');
  console.log('Current usage: ' + usage.fiveHour + '%');
  console.log('Try again when usage is lower or increase maxIterations.');
}

main().catch(console.error);
