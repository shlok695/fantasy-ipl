import { basePath, withBasePath } from '@/lib/basePath';

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
  team?: string;
}

export const PLAYER_INFO: Record<string, PlayerInfo> = {
  "Shreyas Iyer": { team: "PBKS" },
  "Rishabh Pant": { team: "LSG" },
  "Mitchell Starc": { team: "DC" },
  "KL Rahul": { team: "DC" },
  "Jos Buttler": { team: "GT" },
  "Ravichandran Ashwin": { team: "RR" },
  "Kagiso Rabada": { team: "GT" },
  "Mohammed Siraj": { team: "GT" },
  "David Warner": { team: "DC" },
  "Quinton De Kock": { team: "MI" },
  "Faf Du Plessis": { team: "RCB" },
  "Trent Boult": { team: "MI" },
  "Virat Kohli": { team: "RCB" },
  "MS Dhoni": { team: "CSK" },
  "Rohit Sharma": { team: "MI" },
  "Sherfane Rutherford": { team: "MI" }
};

export function getPlayerImage(name: string, role?: string) {
  if (role === "IPL TEAM" || FRANCHISE_LOGOS[name]) {
    return getFranchiseFlag(name);
  }

  if (role) {
    const normalizedRole = role.toLowerCase();
    if (normalizedRole.includes('batter') || normalizedRole.includes('batsman')) return withBasePath("/generic_players/batsman.png");
    if (normalizedRole.includes('bowler')) return withBasePath("/generic_players/bowler.jpeg");
    if (normalizedRole.includes('all-rounder') || normalizedRole.includes('allrounder')) return withBasePath("/generic_players/allrounder.png");
    if (normalizedRole.includes('wicket')) return withBasePath("/generic_players/wicketkeeper.png");
  }

  return withBasePath("/generic_players/batsman.png");
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
  return `${basePath}/generic_players/allrounder.png`;
}
