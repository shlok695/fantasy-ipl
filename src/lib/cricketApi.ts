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

  if (!apiKey || apiKey === "your_api_key_here") {
    console.log(`[MOCK API] Using mock data for Match ID: ${matchId} because CRICKET_API_KEY is missing.`);
    // Simulate network delay
    await new Promise(res => setTimeout(res, 1000));
    return MOCK_SCORECARD;
  }

  // --- REAL CRICKET API IMPLEMENTATION (e.g., cricapi.com) ---
  // Here we would implement the real fetch:
  // const res = await fetch(`https://api.cricapi.com/v1/match_scorecard?id=${matchId}&apikey=${apiKey}`);
  // const data = await res.json();
  // We would then map 'data.data.scorecard' to the PlayerMatchStats interface.
  
  throw new Error("Live API mapping for the specific provider is not yet defined. Please use mock mode or define the provider data mapping.");
}
