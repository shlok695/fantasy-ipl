const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load .env manually
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000/ipl';
// If NEXTAUTH_URL is public (contains svps...ts.net), use localhost for the worker to bypass proxy
const LOCAL_BASE_URL = BASE_URL.includes('ts.net') ? 'http://127.0.0.1:3000/ipl' : BASE_URL;
const INTERVAL_MS = Number(process.env.AUTO_SYNC_WORKER_INTERVAL_MS || 30 * 60 * 1000); // default 30 minutes

if (!SECRET) {
  console.error("ERROR: CRON_SECRET not found in .env");
  process.exit(1);
}

console.log(`[Worker] Started. Target: ${BASE_URL}`);
console.log(`[Worker] Sync interval: ${INTERVAL_MS / 60000} minutes`);

async function runSync() {
  const url = `${LOCAL_BASE_URL}/api/sync-worker?secret=${SECRET}`;
  console.log(`[${new Date().toISOString()}] Attempting sync at ${LOCAL_BASE_URL}...`);

  const client = url.startsWith('https') ? https : http;

  client.get(url, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`[${new Date().toISOString()}] Response:`, json.status || json.error || 'Unknown');
      } catch (e) {
        console.error(`[${new Date().toISOString()}] Failed to parse response:`, data.slice(0, 100));
      }
    });
  }).on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Request failed:`, err.message);
  });
}

// Run immediately, then interval
runSync();
setInterval(runSync, INTERVAL_MS);
