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

const options = {
  hostname: host,
  path: '/cricket-matches',
  headers: {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': host
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('scripts/all_matches.json', data);
    console.log('Saved all matches to scripts/all_matches.json');
  });
});
