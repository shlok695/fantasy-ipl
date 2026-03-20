const fs = require('fs');
const playerTeamsJson = JSON.parse(fs.readFileSync('e:/auction/fantasy-ipl/player_teams.json', 'utf8'));
const missing = ['Ravichandran Ashwin', 'David Warner', 'Faf Du Plessis'];
missing.forEach(name => {
    console.log(`${name}: ${playerTeamsJson[name]}`);
});
