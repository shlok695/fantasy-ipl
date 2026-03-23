// Generic Mock Cricket API Integration
// If CRICKET_API_KEY is not set, we'll return mock stats so the user can test the points engine.
import { PlayerMatchStats } from "../utils/pointsEngine";

// Using standard IPL 2026 player names for the mock to ensure matches
const MOCK_SCORECARD = [
  {
    name: "MS Dhoni",
    stats: {
      runs: 25,
      ballsFaced: 12,
      fours: 2,
      sixes: 2,
      wickets: 0,
      oversBowled: 0,
      runsConceded: 0,
      maidens: 0,
      catches: 2,
      stumpings: 1,
      runOutsDirect: 0,
      runOutsIndirect: 0,
      lbwBowled: 0,
      dotBalls: 4,
      inStartingXI: true,
      isCaptain: true,
    }
  },
  {
    name: "Virat Kohli",
    stats: {
      runs: 82,
      ballsFaced: 52,
      fours: 8,
      sixes: 4,
      wickets: 0,
      oversBowled: 0,
      runsConceded: 0,
      maidens: 0,
      catches: 1,
      stumpings: 0,
      runOutsDirect: 1,
      runOutsIndirect: 0,
      lbwBowled: 0,
      dotBalls: 10,
      inStartingXI: true,
      isViceCaptain: true,
    }
  },
  {
    name: "Jasprit Bumrah",
    stats: {
      runs: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      wickets: 3,
      oversBowled: 4,
      runsConceded: 16,
      maidens: 1,
      catches: 0,
      stumpings: 0,
      runOutsDirect: 0,
      runOutsIndirect: 0,
      lbwBowled: 1,
      dotBalls: 16,
      inStartingXI: true,
    }
  }
];

export async function fetchLiveMatchStats(matchId: string): Promise<{ name: string, stats: PlayerMatchStats }[]> {
  const apiKey = process.env.CRICKET_API_KEY;

  if (!apiKey || apiKey === "your_api_key_here" || matchId === "mock_test_1") {
    console.log(`[MOCK API] Using mock data for Match ID: ${matchId}`);
    // Simulate network delay
    await new Promise(res => setTimeout(res, 1000));
    return MOCK_SCORECARD;
  }

  try {
    const res = await fetch(`https://api.cricapi.com/v1/match_scorecard?id=${matchId}&apikey=${apiKey}`);
    const data = await res.json();
    
    if (data.status !== "success" || !data.data || data.data.length === 0 || !data.data[0].scorecard) {
      throw new Error(data.reason || "Invalid or unsupported match ID, or scorecard not available yet.");
    }
    
    const scorecardArray = data.data[0].scorecard;
    const playerStatsMap = new Map<string, PlayerMatchStats>();
    
    const getStats = (name: string): PlayerMatchStats => {
      if (!playerStatsMap.has(name)) {
        playerStatsMap.set(name, {
          runs: 0, ballsFaced: 0, fours: 0, sixes: 0, 
          wickets: 0, oversBowled: 0, runsConceded: 0, maidens: 0, 
          catches: 0, stumpings: 0, runOutsDirect: 0, runOutsIndirect: 0, 
          lbwBowled: 0, dotBalls: 0, inStartingXI: true,
        });
      }
      return playerStatsMap.get(name)!;
    };

    for (const inning of scorecardArray) {
      if (inning.batting) {
         for (const bat of inning.batting) {
            const name = bat.batsman?.name || "Unknown";
            const stats = getStats(name);
            stats.runs += Number(bat.r || 0);
            stats.ballsFaced += Number(bat.b || 0);
            stats.fours += Number(bat["4s"] || 0);
            stats.sixes += Number(bat["6s"] || 0);
            
            const dismiss = String(bat.dismissal || "");
            if (dismiss.includes("c & b ") || dismiss.includes("c and b ")) {
               const bowlerMatch = dismiss.match(/b\s(.*)/);
               if (bowlerMatch && bowlerMatch[1]) {
                 const bowlerStats = getStats(bowlerMatch[1].trim());
                 bowlerStats.catches += 1;
               }
            } else if (dismiss.includes("c ") && dismiss.includes("b ")) {
               const catcherMatch = dismiss.match(/c\s+(.*?)\s+b\s+/);
               if (catcherMatch && catcherMatch[1]) {
                 let c = catcherMatch[1].trim();
                 if (c.startsWith("sub (") || c.startsWith("sub(")) {
                    c = c.replace(/sub\s*\(/, "").replace(/\)/, "").trim();
                 }
                 c = c.replace(/†/g, "").replace(/\+/g, "").trim();
                 
                 if (c !== "&" && c !== "and") {
                   const catcherStats = getStats(c);
                   catcherStats.catches += 1;
                 }
               }
            } else if (dismiss.includes("st ")) {
               const stumperMatch = dismiss.match(/st\s(.*?)\sb\s/);
               if (stumperMatch && stumperMatch[1]) {
                 const stumperStats = getStats(stumperMatch[1].trim());
                 stumperStats.stumpings += 1;
               }
            } else if (dismiss.includes("run out")) {
               const runnerMatch = dismiss.match(/run out \((.*?)\)/);
               if (runnerMatch && runnerMatch[1]) {
                 const thrower = runnerMatch[1].split('/')[0].trim();
                 if (thrower) {
                    const throwerStats = getStats(thrower);
                    throwerStats.runOutsDirect += 1; 
                 }
               }
            } else if (dismiss.includes("lbw") || dismiss.startsWith("b ")) {
               const bowlerMatch = dismiss.match(/b\s(.*)/);
               if (bowlerMatch && bowlerMatch[1]) {
                 const bowlerStats = getStats(bowlerMatch[1].trim());
                 bowlerStats.lbwBowled += 1; // triggers +8 bonus in Points Engine
               }
            }
         }
      }
      
      if (inning.bowling) {
         for (const bowl of inning.bowling) {
            const name = bowl.bowler?.name || "Unknown";
            const stats = getStats(name);
            stats.oversBowled += Number(bowl.o || 0);
            stats.maidens += Number(bowl.m || 0);
            stats.runsConceded += Number(bowl.r || 0);
            stats.wickets += Number(bowl.w || 0);
            stats.dotBalls = (stats.dotBalls || 0) + Number(bowl['0s'] || bowl.d || 0);
         }
      }
    }
    
    // Convert Map back to array
    const result = [];
    for (const [name, stats] of playerStatsMap.entries()) {
      if (name !== 'Unknown') {
        result.push({ name, stats });
      }
    }
    
    return result;
  } catch(e: any) {
    throw new Error(`Failed to map API scorecard: ${e.message}`);
  }
}
