
const https = require('https');
const fs = require('fs');

const env = fs.readFileSync('.env','utf8')
  .split('\n')
  .reduce((acc, line) => {
    const l = line.trim();
    if (!l || l.startsWith('#')) return acc;
    const i = l.indexOf('=');
    if (i === -1) return acc;
    const k = l.slice(0, i).trim();
    const v = l.slice(i + 1).trim().replace(/^\"|\"$/g, '');
    acc[k] = v;
    return acc;
  }, {});

const host = 'cricket-api-free-data.p.rapidapi.com';
const matchId = '149629';

const paths = [
  '/cricket-scorecard?matchid=' + matchId,
  '/match-scorecard?matchid=' + matchId,
  '/scorecard?matchid=' + matchId,
  '/match-details?matchid=' + matchId,
  '/match-score?matchid=' + matchId,
  '/cricket-livescores',
  '/match-scorecard?id=' + matchId,
  '/cricket-match-scorecard?matchid=' + matchId
];

paths.forEach(path => {
  const req = https.get({
    hostname: host,
    path,
    headers: {
      'x-rapidapi-key': env.RAPIDAPI_KEY,
      'x-rapidapi-host': host,
      'accept': 'application/json'
    }
  }, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('\n===', path, '===');
      console.log('status:', res.statusCode);
      console.log('content-type:', res.headers['content-type']);
      try {
        const json = JSON.parse(data);
        console.log('keys:', Object.keys(json).slice(0, 15));
        console.log('preview:', JSON.stringify(json, null, 2).slice(0, 800));
      } catch {
        console.log('raw:', data.slice(0, 800));
      }
    });
  });

  req.on('error', err => {
    console.log('\n===', path, '===');
    console.log('request error:', err.message);
  });
});
