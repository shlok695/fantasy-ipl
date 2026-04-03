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
    try {
      const result = JSON.parse(data);
      if (result.response && Array.isArray(result.response)) {
        console.log(`Found ${result.response.length} matches.`);
        const iplMatches = result.response.filter(m => 
          m.title.includes('IPL') || 
          m.title.includes('Indian Premier League') ||
          m.series_id === 5140
        );
        console.log('IPL Matches:', JSON.stringify(iplMatches, null, 2));
      } else {
        console.log('No matches in response:', data.slice(0, 500));
      }
    } catch (e) {
      console.log('Error parsing:', e.message, data.slice(0, 500));
    }
  });
});
