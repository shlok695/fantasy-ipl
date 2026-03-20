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
  "CSK": "/team-logos/CSK.jpg",
  "MI": "/team-logos/MI.jpg",
  "RCB": "/team-logos/RCB.jpg",
  "KKR": "/team-logos/kkr.jpg",
  "DC": "/team-logos/dc.jpg",
  "RR": "/team-logos/RR.jpg",
  "PBKS": "/team-logos/PBKS.jpg",
  "SRH": "/team-logos/SRH.jpg",
  "LSG": "/team-logos/lsg.jpg",
  "GT": "/team-logos/GT.jpg"
};

export interface PlayerInfo {
  image?: string;
  age?: number;
  team?: string;
}

export const PLAYER_INFO: Record<string, PlayerInfo> = {
  "Shreyas Iyer": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/1563.png", age: 29, team: "KKR" },
  "Rishabh Pant": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/2972.png", age: 26, team: "DC" },
  "Mitchell Starc": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/137.png", age: 34, team: "KKR" },
  "KL Rahul": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/1125.png", age: 32, team: "LSG" },
  "Jos Buttler": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/509.png", age: 33, team: "RR" },
  "Ravichandran Ashwin": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/8.png", age: 37, team: "RR" },
  "Kagiso Rabada": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/116.png", age: 29, team: "PBKS" },
  "Mohammed Siraj": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/3840.png", age: 30, team: "RCB" },
  "David Warner": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/170.png", age: 37, team: "DC" },
  "Quinton De Kock": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/834.png", age: 31, team: "LSG" },
  "Faf Du Plessis": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/24.png", age: 39, team: "RCB" },
  "Trent Boult": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/969.png", age: 34, team: "RR" },
  "Virat Kohli": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/164.png", age: 35, team: "RCB" },
  "MS Dhoni": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/1.png", age: 42, team: "CSK" },
  "Rohit Sharma": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/107.png", age: 37, team: "MI" },
  "Sherfane Rutherford": { image: "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/2881.png", age: 25, team: "KKR" }
};

export function getPlayerImage(name: string) {
  if (PLAYER_INFO[name]?.image) return PLAYER_INFO[name].image;
  return "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
}

export function getPlayerMeta(name: string) {
  return PLAYER_INFO[name] || {};
}

export function getCountryFlag(country: string | null | undefined) {
  const resolvedCountry = country && country.trim() !== "" ? country : "India";
  // Look up case-insensitive
  const found = Object.entries(COUNTRY_FLAGS).find(([key]) => key.toLowerCase() === resolvedCountry.toLowerCase());
  return found ? found[1] : null;
}

export function getFranchiseFlag(teamName: string) {
  // If the user name perfectly matches an IPL team
  const found = Object.entries(FRANCHISE_LOGOS).find(([key]) => key.toLowerCase() === teamName.toLowerCase());
  if (found) return found[1];
  
  // Otherwise generic fallback avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=1e1b4b&color=818cf8&size=128&bold=true`;
}
