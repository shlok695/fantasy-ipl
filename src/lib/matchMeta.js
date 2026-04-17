const TEAM_CODE_ALIASES = {
  "chennai super kings": "CSK",
  "delhi capitals": "DC",
  "gujarat titans": "GT",
  "kolkata knight riders": "KKR",
  "lucknow super giants": "LSG",
  "mumbai indians": "MI",
  "punjab kings": "PBKS",
  "rajasthan royals": "RR",
  "royal challengers bengaluru": "RCB",
  "royal challengers bangalore": "RCB",
  "sunrisers hyderabad": "SRH",
};

const IPL_TEAM_CODES = new Set(Object.values(TEAM_CODE_ALIASES));

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeTeamCode(value) {
  const text = normalizeText(value);
  if (!text) return null;

  const alias = TEAM_CODE_ALIASES[normalizeKey(text)];
  if (alias) return alias;

  if (/^[A-Z]{2,5}$/i.test(text)) {
    const compact = text.toUpperCase().replace(/\s+/g, "");
    if (compact.endsWith("W")) {
      const stripped = compact.slice(0, -1);
      if (IPL_TEAM_CODES.has(stripped)) {
        return stripped;
      }
    }
    return compact;
  }

  return text
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 5)
    .toUpperCase() || null;
}

function uniqueNonEmpty(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function inferTeamsFromScorecardPayload(data) {
  const appIndex = data?.appindex || data?.appIndex || null;
  const webUrl = normalizeText(appIndex?.weburl || appIndex?.webURL || "");
  const seoTitle = normalizeText(appIndex?.seotitle || appIndex?.seoTitle || "");

  const webUrlMatch = webUrl.match(/\/([a-z]{2,5})-vs-([a-z]{2,5})(?:-|\/|$)/i);
  if (webUrlMatch) {
    return uniqueNonEmpty([webUrlMatch[1], webUrlMatch[2]]).slice(0, 2);
  }

  const seoTitleMatch = seoTitle.match(/\b([a-z]{2,5})\s+vs\s+([a-z]{2,5})\b/i);
  if (seoTitleMatch) {
    return uniqueNonEmpty([seoTitleMatch[1], seoTitleMatch[2]]).slice(0, 2);
  }

  const fixtureTeams = uniqueNonEmpty([
    data?.matchHeader?.team1?.name,
    data?.matchHeader?.team1?.teamName,
    data?.matchHeader?.team1?.shortName,
    data?.matchHeader?.team1?.teamSName,
    data?.matchInfo?.team1?.teamName,
    data?.matchInfo?.team1Name,
    data?.team_1,
  ]);

  const fixtureTeams2 = uniqueNonEmpty([
    data?.matchHeader?.team2?.name,
    data?.matchHeader?.team2?.teamName,
    data?.matchHeader?.team2?.shortName,
    data?.matchHeader?.team2?.teamSName,
    data?.matchInfo?.team2?.teamName,
    data?.matchInfo?.team2Name,
    data?.team_2,
  ]);

  if (fixtureTeams.length > 0 && fixtureTeams2.length > 0) {
    return [fixtureTeams[0], fixtureTeams2[0]];
  }

  const innings = Array.isArray(data?.scorecard)
    ? data.scorecard
    : Array.isArray(data?.scoreCard)
      ? data.scoreCard
      : [];

  const inningNames = uniqueNonEmpty(
    innings.map((entry) => entry?.batteamname || entry?.batteamsname || "")
  );

  if (inningNames.length >= 2) {
    return inningNames.slice(0, 2);
  }

  const status = normalizeText(data?.status);
  const vsMatch = status.match(/^(.+?)\s+vs\s+(.+)$/i);
  if (vsMatch) {
    return uniqueNonEmpty([vsMatch[1], vsMatch[2]]).slice(0, 2);
  }

  return inningNames.slice(0, 2);
}

function createDisplayId(team1Code, team2Code, fallbackMatchId) {
  if (team1Code && team2Code) {
    return `${normalizeTeamCode(team1Code)}vs${normalizeTeamCode(team2Code)}`;
  }

  return normalizeText(fallbackMatchId) || null;
}

function parseStartedAt(value) {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  if (/^\d+$/.test(text)) {
    const numericValue = Number.parseInt(text, 10);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return null;
    }

    const timestamp = text.length >= 13 ? numericValue : numericValue * 1000;
    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function createMatchMetaRecord(matchId, options = {}) {
  const team1Name = normalizeText(options.team1Name);
  const team2Name = normalizeText(options.team2Name);
  const team1Code = normalizeTeamCode(options.team1Code || team1Name);
  const team2Code = normalizeTeamCode(options.team2Code || team2Name);

  const shortTitle = team1Code && team2Code
    ? `${team1Code} vs ${team2Code}`
    : normalizeText(options.shortTitle);
  const title = team1Name && team2Name
    ? `${team1Name} vs ${team2Name}`
    : normalizeText(options.title || shortTitle);

  return {
    id: String(matchId || "").trim(),
    displayId: createDisplayId(team1Code, team2Code, matchId),
    shortTitle: shortTitle || null,
    title: title || null,
    season: normalizeText(options.season) || null,
    status: normalizeText(options.status) || null,
    team1Code: team1Code || null,
    team2Code: team2Code || null,
    team1Name: team1Name || null,
    team2Name: team2Name || null,
    source: normalizeText(options.source) || null,
    startedAt: options.startedAt || null,
  };
}

function createMatchMetaFromRapidScorecard(matchId, data, source = "rapidapi") {
  const teams = inferTeamsFromScorecardPayload(data);
  return createMatchMetaRecord(matchId, {
    team1Name: teams[0] || null,
    team2Name: teams[1] || null,
    team1Code:
      data?.matchHeader?.team1?.shortName ||
      data?.matchHeader?.team1?.teamSName ||
      data?.matchInfo?.team1?.shortName ||
      null,
    team2Code:
      data?.matchHeader?.team2?.shortName ||
      data?.matchHeader?.team2?.teamSName ||
      data?.matchInfo?.team2?.shortName ||
      null,
    title:
      normalizeText(data?.matchHeader?.matchDescription) ||
      normalizeText(data?.matchHeader?.title) ||
      null,
    season:
      normalizeText(data?.matchHeader?.seriesName) ||
      normalizeText(data?.matchInfo?.seriesName) ||
      null,
    status:
      data?.matchHeader?.status ||
      data?.matchInfo?.status ||
      data?.status ||
      null,
    startedAt: parseStartedAt(
      data?.matchHeader?.startTime ||
      data?.matchHeader?.startDate ||
      data?.matchInfo?.startDate ||
      data?.matchInfo?.startTime ||
      null
    ),
    source,
  });
}

module.exports = {
  TEAM_CODE_ALIASES,
  createMatchMetaFromRapidScorecard,
  createMatchMetaRecord,
  normalizeTeamCode,
};
