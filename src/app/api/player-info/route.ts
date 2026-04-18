import { NextResponse } from 'next/server';
import playerTeams from '../../../../data_dump/player_teams.json';
import { getErrorMessage } from '@/lib/errorMessage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get('name');
  if (!name) return NextResponse.json({ error: "Missing Name" }, { status: 400 });

  try {
    const res = await fetch(`https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(name)}&limit=1`, { cache: 'no-store' });
    const searchData = await res.json();
    
    const playerEntry = searchData?.results?.[0]?.contents?.[0];
    if (!playerEntry || playerEntry.type !== 'player') {
       return NextResponse.json({ image: null, iplTeam: null });
    }

    const espnUrl = (playerEntry.link?.web || playerEntry.link?.url);
    if (!espnUrl) return NextResponse.json({ image: null, iplTeam: null });

    const bustUrl = espnUrl.includes('?') ? `${espnUrl}&t=${Date.now()}` : `${espnUrl}?t=${Date.now()}`;

    const htmlRes = await fetch(bustUrl, {
       headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.espncricinfo.com/'
       },
       cache: 'no-store'
    });
    const html = await htmlRes.text();

    const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    let image = imgMatch ? imgMatch[1] : null;
    if (image?.includes('fallback') || image?.includes('default')) image = null;


    const knownTeams = ["Chennai Super Kings", "Mumbai Indians", "Royal Challengers Bengaluru", "Royal Challengers Bangalore", "Kolkata Knight Riders", "Delhi Capitals", "Rajasthan Royals", "Punjab Kings", "Sunrisers Hyderabad", "Lucknow Super Giants", "Gujarat Titans"];
    let iplTeam: string | null = null;
    try {
      // Normalize names to match keys smoothly
      const dbKey = Object.keys(playerTeams).find(k => k.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(k.toLowerCase()));
      if (dbKey) {
        iplTeam = playerTeams[dbKey as keyof typeof playerTeams];
      }
    } catch {}

    if (!iplTeam) {
      for (const t of knownTeams) {
         if (html.includes(t)) {
            iplTeam = t === "Royal Challengers Bangalore" ? "RCB" : t;
            break;
         }
      }
    }

    const teamMap: Record<string, string> = {
      "Chennai Super Kings": "CSK",
      "Mumbai Indians": "MI",
      "Royal Challengers Bengaluru": "RCB",
      "Kolkata Knight Riders": "KKR",
      "Delhi Capitals": "DC",
      "Rajasthan Royals": "RR",
      "Punjab Kings": "PBKS",
      "Sunrisers Hyderabad": "SRH",
      "Lucknow Super Giants": "LSG",
      "Gujarat Titans": "GT"
    };

    if (iplTeam && teamMap[iplTeam]) {
       iplTeam = teamMap[iplTeam];
    }
    
    if (!iplTeam) {
      try {
        if (playerTeams[name as keyof typeof playerTeams]) {
          iplTeam = playerTeams[name as keyof typeof playerTeams];
        }
      } catch {}
    }

    return NextResponse.json({ image, iplTeam });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) });
  }
}
