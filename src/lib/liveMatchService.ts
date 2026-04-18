import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_CRICBUZZ_KEY || '';
const RAPIDAPI_HOST = 'cricket-api-free-data.p.rapidapi.com';

export interface ExternalMatch {
  id?: string | number;
  series?: string;
  series_name?: string;
  tournament?: string;
  competition?: string;
  league?: string;
  title?: string;
  name?: string;
  matchTitle?: string;
  team_id_1?: string | number;
  team_id_2?: string | number;
  team_1?: string;
  team_2?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Fetches live matches with defensive root handling.
 */
export async function fetchLiveMatches(): Promise<ExternalMatch[]> {
  if (!RAPIDAPI_KEY) {
    console.error('[LiveSync] Error: RAPIDAPI_KEY not found in environment');
    return [];
  }

  try {
    console.log(`[LiveSync] Fetching from https://${RAPIDAPI_HOST}/cricket-livescores`);
    const response = await axios.get(`https://${RAPIDAPI_HOST}/cricket-livescores`, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
        'accept': 'application/json'
      },
      timeout: 10000
    });

    const data = response.data;
    console.log('[LiveSync] Raw response shape:', typeof data, Array.isArray(data) ? 'Array' : 'Object', Object.keys(data || {}));

    // Defensive root handling per requirement 3
    let matches: ExternalMatch[] = [];
    if (Array.isArray(data)) {
      matches = data;
    } else if (data && typeof data === 'object') {
      matches = data.matches || data.data || data.response || [];
    }

    console.log(`[LiveSync] Total live matches fetched: ${matches.length}`);
    return matches;
  } catch (error: any) {
    console.error('[LiveSync] Fetch failed:', error.message);
    return [];
  }
}

/**
 * Checks if a match is an IPL match based on various fields.
 */
export function isIplMatch(match: ExternalMatch): boolean {
  const iplPatterns = [/ipl/i, /indian premier league/i];
  const fieldsToCheck = [
    'series', 'series_name', 'tournament', 'competition', 
    'league', 'title', 'name', 'matchTitle'
  ];

  return fieldsToCheck.some(field => {
    const value = String(match[field] || '');
    return iplPatterns.some(pattern => pattern.test(value));
  });
}

/**
 * Normalizes team names for DB matching.
 */
export function normalizeTeamName(name: string): string {
  if (!name) return 'Unknown';
  
  const teamMap: Record<string, string> = {
    'mi': 'MI', 'mumbai indians': 'MI',
    'kkr': 'KKR', 'kolkata knight riders': 'KKR',
    'rcb': 'RCB', 'royal challengers bangalore': 'RCB', 'royal challengers bengaluru': 'RCB',
    'csk': 'CSK', 'chennai super kings': 'CSK',
    'dc': 'DC', 'delhi capitals': 'DC',
    'gt': 'GT', 'gujarat titans': 'GT',
    'lsg': 'LSG', 'lucknow super giants': 'LSG',
    'pbks': 'PBKS', 'punjab kings': 'PBKS',
    'rr': 'RR', 'rajasthan royals': 'RR',
    'srh': 'SRH', 'sunrisers hyderabad': 'SRH'
  };

  const cleanName = name.toLowerCase().trim();
  return teamMap[cleanName] || name;
}

/**
 * Maps external match structure to a clean internal version.
 */
export function mapExternalMatchToInternal(match: ExternalMatch) {
  try {
    return {
      matchId: String(match.id || match.matchId || ''),
      title: match.title || match.name || match.matchTitle || 'Unknown Match',
      team1: normalizeTeamName(String(match.team_1 || '')),
      team2: normalizeTeamName(String(match.team_2 || '')),
      status: match.status || 'Live',
      raw: match
    };
  } catch {
    console.error('[LiveSync] Mapping failure for match:', match.id);
    return null;
  }
}

/**
 * Main sync function with deduplication and logging.
 */
export async function syncIplMatches() {
  try {
    const allMatches = await fetchLiveMatches();
    const iplMatches = allMatches.filter(isIplMatch);
    
    console.log(`[LiveSync] Total IPL matches detected: ${iplMatches.length}`);

    for (const match of iplMatches) {
      const internalMatch = mapExternalMatchToInternal(match);
      if (!internalMatch || !internalMatch.matchId) continue;

      const payloadString = JSON.stringify(match);
      const hash = crypto.createHash('md5').update(payloadString).digest('hex');

      // Requirement 7: Prevent duplicate additions by diffing vs previous state
      const existingState = await prisma.liveMatchState.findUnique({
        where: { id: internalMatch.matchId }
      });

      if (existingState && existingState.processedHash === hash) {
        console.log(`[LiveSync] Match ${internalMatch.matchId} (${internalMatch.title}) unchanged. Skipping sync.`);
        continue;
      }

      console.log(`[LiveSync] Match ${internalMatch.matchId} changed or new. Syncing points...`);

      // Requirement 6: Upsert raw live payload
      await prisma.liveMatchState.upsert({
        where: { id: internalMatch.matchId },
        update: {
          rawPayload: payloadString,
          processedHash: hash,
          lastUpdated: new Date()
        },
        create: {
          id: internalMatch.matchId,
          rawPayload: payloadString,
          processedHash: hash,
          lastUpdated: new Date()
        }
      });

      // HERE: You would call your existing points calculation logic
      // e.g., await syncMatchPoints(internalMatch.matchId);
      
      console.log(`[LiveSync] Sync success for match: ${internalMatch.title}`);
    }

    return { success: true, count: iplMatches.length };
  } catch (error: any) {
    console.error('[LiveSync] Sync failed:', error.message);
    return { success: false, error: error.message };
  }
}
