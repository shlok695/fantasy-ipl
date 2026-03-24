export const COUNTRY_FLAGS: Record<string, string> = {
  "India": "https://flagcdn.com/w40/in.png",
  "Indian": "https://flagcdn.com/w40/in.png",
  "IND": "https://flagcdn.com/w40/in.png",
  "Australia": "https://flagcdn.com/w40/au.png",
  "Australian": "https://flagcdn.com/w40/au.png",
  "AUS": "https://flagcdn.com/w40/au.png",
  "England": "https://flagcdn.com/w40/gb-eng.png",
  "English": "https://flagcdn.com/w40/gb-eng.png",
  "ENG": "https://flagcdn.com/w40/gb-eng.png",
  "South Africa": "https://flagcdn.com/w40/za.png",
  "South African": "https://flagcdn.com/w40/za.png",
  "SA": "https://flagcdn.com/w40/za.png",
  "New Zealand": "https://flagcdn.com/w40/nz.png",
  "New Zealander": "https://flagcdn.com/w40/nz.png",
  "NZ": "https://flagcdn.com/w40/nz.png",
  "West Indies": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9b/Cricket_West_Indies_Logo.svg/100px-Cricket_West_Indies_Logo.svg.png",
  "West Indian": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9b/Cricket_West_Indies_Logo.svg/100px-Cricket_West_Indies_Logo.svg.png",
  "WI": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9b/Cricket_West_Indies_Logo.svg/100px-Cricket_West_Indies_Logo.svg.png",
  "Sri Lanka": "https://flagcdn.com/w40/lk.png",
  "Sri Lankan": "https://flagcdn.com/w40/lk.png",
  "SL": "https://flagcdn.com/w40/lk.png",
  "Afghanistan": "https://flagcdn.com/w40/af.png",
  "Afghan": "https://flagcdn.com/w40/af.png",
  "AFG": "https://flagcdn.com/w40/af.png",
  "Bangladesh": "https://flagcdn.com/w40/bd.png",
  "BAN": "https://flagcdn.com/w40/bd.png",
  "Ireland": "https://flagcdn.com/w40/ie.png",
  "IRE": "https://flagcdn.com/w40/ie.png",
  "Zimbabwe": "https://flagcdn.com/w40/zw.png",
  "ZIM": "https://flagcdn.com/w40/zw.png",
  "Netherlands": "https://flagcdn.com/w40/nl.png",
  "Namibia": "https://flagcdn.com/w40/na.png",
  "Nepal": "https://flagcdn.com/w40/np.png",
  "USA": "https://flagcdn.com/w40/us.png",
  "Oman": "https://flagcdn.com/w40/om.png",
  "Scotland": "https://flagcdn.com/w40/gb-sct.png",
  "UAE": "https://flagcdn.com/w40/ae.png"
};

import { basePath } from '@/lib/basePath';

export const FRANCHISE_LOGOS: Record<string, string> = {
  "CSK": `${basePath}/team-logos/CSK.jpg`,
  "MI": `${basePath}/team-logos/MI.jpg`,
  "RCB": `${basePath}/team-logos/RCB.jpg`,
  "KKR": `${basePath}/team-logos/kkr.jpg`,
  "DC": `${basePath}/team-logos/dc.jpg`,
  "RR": `${basePath}/team-logos/RR.jpg`,
  "PBKS": `${basePath}/team-logos/PBKS.jpg`,
  "SRH": `${basePath}/team-logos/SRH.jpg`,
  "LSG": `${basePath}/team-logos/lsg.jpg`,
  "GT": `${basePath}/team-logos/GT.jpg`
};

export interface PlayerInfo {
  image?: string;
  team?: string;
}

export const PLAYER_INFO: Record<string, PlayerInfo> = {
  "Shreyas Iyer": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/1563.png", team: "PBKS" },
  "Rishabh Pant": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/2972.png", team: "LSG" },
  "Mitchell Starc": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/137.png", team: "DC" },
  "KL Rahul": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/1125.png", team: "DC" },
  "Jos Buttler": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/509.png", team: "GT" },
  "Ravichandran Ashwin": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/8.png", team: "RR" },
  "Kagiso Rabada": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/116.png", team: "GT" },
  "Mohammed Siraj": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/3840.png", team: "GT" },
  "David Warner": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/170.png", team: "DC" },
  "Quinton De Kock": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/834.png", team: "MI" },
  "Faf Du Plessis": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/24.png", team: "RCB" },
  "Trent Boult": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/969.png", team: "MI" },
  "Virat Kohli": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/164.png", team: "RCB" },
  "MS Dhoni": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/1.png", team: "CSK" },
  "Rohit Sharma": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/107.png", team: "MI" },
  "Sherfane Rutherford": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/2881.png", team: "MI" }
};

export function getPlayerImage(name: string, role?: string) {
  // 1. Check hardcoded specific players
  if (PLAYER_INFO[name]?.image) return PLAYER_INFO[name].image;
  
  // 2. Check if it's an IPL Team (CSK, MI, etc.)
  if (role === "IPL TEAM" || FRANCHISE_LOGOS[name]) {
    return getFranchiseFlag(name);
  }

  // 3. Generic Role-based placeholders
  if (role) {
    const normalizedRole = role.toLowerCase();
    if (normalizedRole.includes('batter') || normalizedRole.includes('batsman')) return `${basePath}/generic_players/batsman.png`;
    if (normalizedRole.includes('bowler')) return `${basePath}/generic_players/bowler.jpeg`;
    if (normalizedRole.includes('all-rounder') || normalizedRole.includes('allrounder')) return `${basePath}/generic_players/allrounder.png`;
    if (normalizedRole.includes('wicket')) return `${basePath}/generic_players/wicketkeeper.png`;
  }

  return "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
}

export function getPlayerMeta(name: string) {
  return PLAYER_INFO[name] || {};
}

export function getCountryFlag(country: string | null | undefined) {
  const resolvedCountry = country && country.trim() !== "" ? country : "India";
  const found = Object.entries(COUNTRY_FLAGS).find(([key]) => key.toLowerCase() === resolvedCountry.toLowerCase());
  return found ? found[1] : null;
}

export function getFranchiseFlag(teamName: string) {
  const found = Object.entries(FRANCHISE_LOGOS).find(([key]) => key.toLowerCase() === teamName.toLowerCase());
  if (found) return found[1];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=1e1b4b&color=818cf8&size=128&bold=true`;
}
