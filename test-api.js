const fs = require('fs');

const API_KEY = process.env.CRICKET_API_KEY || "9d6d54fc-293b-4d1f-9bc1-9e6c67af8b77"; // Falls back to placeholder if not set

async function run() {
  try {
    const listRes = await fetch(`https://api.cricapi.com/v1/matches?apikey=${API_KEY}&offset=0`);
    const listData = await listRes.json();
    
    if (listData && listData.data) {
       for (const match of listData.data) {
         if (match.matchEnded) {
           const matchRes = await fetch(`https://api.cricapi.com/v1/match_scorecard?apikey=${API_KEY}&id=${match.id}`);
           const matchData = await matchRes.json();
           
           if (matchData.status === "success" && matchData.data && matchData.data.scorecard) {
             fs.writeFileSync('cricketapi-scorecard.json', JSON.stringify(matchData, null, 2), 'utf8');
             console.log(`Saved scorecard for match ${match.id} to cricketapi-scorecard.json`);
             return;
           }
         }
       }
    }
    console.log("No valid scorecards found in the recent ended matches.");
  } catch(e) {
    console.error(e);
  }
}
run();
