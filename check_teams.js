const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = 'e:/auction/auction_db_final.xlsx';
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const playerTeamsJsonPath = 'e:/auction/fantasy-ipl/player_teams.json';
const playerTeamsJson = JSON.parse(fs.readFileSync(playerTeamsJsonPath, 'utf8'));

const TEAM_MAP = {
    "Chennai Super Kings": "CSK",
    "Mumbai Indians": "MI",
    "Royal Challengers Bangalore": "RCB",
    "Royal Challengers Bengaluru": "RCB",
    "Kolkata Knight Riders": "KKR",
    "Delhi Capitals": "DC",
    "Rajasthan Royals": "RR",
    "Punjab Kings": "PBKS",
    "Sunrisers Hyderabad": "SRH",
    "Lucknow Super Giants": "LSG",
    "Gujarat Titans": "GT"
};

console.log('--- Column Names ---');
console.log(Object.keys(data[0]));

console.log('\n--- Discrepancies between Excel and player_teams.json ---');
let jsonDiscrepancies = 0;
data.forEach(p => {
    const name = p.Player || p.Name;
    const fullTeam = p['IPL Team (2026)'] || p.Team || p.IPL_Team || p.New_Team || p['New Team'];
    const team = TEAM_MAP[fullTeam] || fullTeam;
    if (name && team) {
        const jsonTeam = playerTeamsJson[name];
        if (jsonTeam && jsonTeam !== team) {
            console.log(`JSON Discrepancy for [${name}]: Excel=[${team}] (${fullTeam}), JSON=[${jsonTeam}]`);
            jsonDiscrepancies++;
        }
    }
});
console.log(`Total JSON discrepancies: ${jsonDiscrepancies}`);

console.log('\n--- Hardcoded PLAYER_INFO check ---');
const playerIndexContent = fs.readFileSync('e:/auction/fantasy-ipl/src/lib/playerIndex.ts', 'utf8');
const playerInfoMatch = playerIndexContent.match(/export const PLAYER_INFO: Record<string, PlayerInfo> = ({[\s\S]*?});/);
let hardcodedDiscrepancies = 0;
if (playerInfoMatch) {
    const playerInfoText = playerInfoMatch[1];
    data.forEach(p => {
        const name = p.Player || p.Name;
        const fullTeam = p['IPL Team (2026)'] || p.Team || p.IPL_Team || p.New_Team || p['New Team'];
        const team = TEAM_MAP[fullTeam] || fullTeam;
        
        // Find if this name exists in PLAYER_INFO
        const nameEscaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`"${nameEscaped}":\\s*{[^}]*team:\\s*"([^"]*)"`);
        const match = playerInfoText.match(regex);
        
        if (match) {
            const hardcodedTeam = match[1];
            if (hardcodedTeam !== team) {
                console.log(`Hardcoded Discrepancy for [${name}]: Excel=[${team}] (${fullTeam}), PLAYER_INFO=[${hardcodedTeam}]`);
                hardcodedDiscrepancies++;
            }
        }
    });
}
console.log(`Total hardcoded discrepancies: ${hardcodedDiscrepancies}`);

// Special check for Shreyas Iyer
const shreyas = data.find(p => (p.Player || p.Name) === 'Shreyas Iyer');
console.log('\n--- Shreyas Iyer Detail ---');
console.log(JSON.stringify(shreyas, null, 2));
