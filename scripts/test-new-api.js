const https = require('https');
const fs = require('fs');
const path = require('path');

function getEnv() {
  const envPath = path.resolve(__dirname, '.env');
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

console.log(`Testing host ${host}...`);

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    console.log(`Trying ${endpoint}...`);
    const options = {
      hostname: host,
      path: endpoint,
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': host
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[${endpoint}] Status:`, res.statusCode);
        try {
          const result = JSON.parse(data);
          console.log(`[${endpoint}] Response keys:`, Object.keys(result));
          if (result.response && Array.isArray(result.response)) {
            console.log(`[${endpoint}] Found ${result.response.length} items.`);
            if (result.response.length > 0) {
              console.log(`[${endpoint}] First item sample:`, JSON.stringify(result.response[0]).slice(0, 200));
            }
          } else {
            console.log(`[${endpoint}] Response:`, data.slice(0, 200));
          }
        } catch (e) {
          console.log(`[${endpoint}] Raw data:`, data.slice(0, 200));
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(`[${endpoint}] Error:`, err.message);
      resolve();
    });
  });
}

async function run() {
  await testEndpoint('/cricket-matches');
  await testEndpoint('/cricket-live-score');
  await testEndpoint('/cricket-match-scorecard?matchid=1'); // dummy matchid to see structure
}

run();
