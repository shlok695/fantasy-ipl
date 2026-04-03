const https = require('https');
const fs = require('fs');
const path = require('path');

function getEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });
  return env;
}

const env = getEnv();
const apiKey = env.RAPIDAPI_CRICBUZZ_KEY;
const host = 'cricket-api-free-data.p.rapidapi.com';
const matchId = '100720'; // Using the ID I saw in the matches response

async function test(path) {
  console.log(`Trying ${path}...`);
  return new Promise(resolve => {
    const options = {
      hostname: host,
      path: path,
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': host
      }
    };
    https.get(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[${path}] Status:`, res.statusCode);
        console.log(`[${path}] Data:`, data.slice(0, 500));
        resolve();
      });
    }).on('error', e => {
      console.log(`[${path}] Error:`, e.message);
      resolve();
    });
  });
}

async function run() {
  await test(`/cricket-match-details?matchid=${matchId}`);
  await test(`/cricket-match-scorecard?matchid=${matchId}`);
  await test(`/cricket-fixture-all`);
  await test(`/cricket-live-score`);
}

run();
