const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = 'e:/auction/auction_db_final.xlsx';
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const playerIndexContent = fs.readFileSync('e:/auction/fantasy-ipl/src/lib/playerIndex.ts', 'utf8');
const playerInfoMatch = playerIndexContent.match(/export const PLAYER_INFO: Record<string, PlayerInfo> = ({[\s\S]*?});/);

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

if (playerInfoMatch) {
    const playerInfoText = playerInfoMatch[1];
    const playerNames = playerInfoText.match(/"([^"]+)":/g).map(m => m.replace(/"/g, '').replace(':', ''));
    
    playerNames.forEach(name => {
        const p = data.find(x => {
            const rowName = x.Player || x.Name;
            return rowName && (rowName.toLowerCase() === name.toLowerCase() || rowName.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(rowName.toLowerCase()));
        });
        if (p) {
            const fullTeam = p['IPL Team (2026)'] || p.Team || p.IPL_Team;
            const team = TEAM_MAP[fullTeam] || fullTeam;
            console.log(`MATCH [${name}]: Excel=[${team}] (${fullTeam})`);
        } else {
            console.log(`MISS [${name}]: Not in Excel`);
        }
    });
}
