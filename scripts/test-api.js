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
const host = env.RAPIDAPI_CRICBUZZ_HOST || 'cricbuzz-cricket.p.rapidapi.com';
const matchId = '149629';

console.log(`Checking match ${matchId} on ${host}...`);

const options = {
  hostname: host,
  path: `/mcenter/v1/${matchId}/scard`,
  headers: {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': host
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const result = JSON.parse(data);
    console.log('Keys in response:', Object.keys(result));
    if (result.scoreCard) console.log('scoreCard length:', result.scoreCard.length);
    else console.log('scoreCard is MISSING');
    
    // Also try hscard
    console.log('Trying hscard...');
    const options2 = {...options, path: `/mcenter/v1/${matchId}/hscard`};
    https.get(options2, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        const result2 = JSON.parse(data2);
        console.log('hscard Keys:', Object.keys(result2));
        if (result2.scoreCard) console.log('hscard scoreCard length:', result2.scoreCard.length);
        else console.log('hscard scoreCard is MISSING');
      });
    });
  });
});
