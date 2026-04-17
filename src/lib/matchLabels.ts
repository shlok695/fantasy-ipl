type MatchLabelFormat = "compact" | "standard" | "full";

interface MatchLabelOverrideMeta {
  displayId?: string | null;
  shortTitle?: string | null;
  title?: string | null;
  season?: string | null;
}

interface MatchLabelMeta {
  season: string;
  matchNumber?: number;
  shortTeams?: [string, string];
  fullTeams?: [string, string];
}

const IPL_TEAM_CODES = new Set(["CSK", "DC", "GT", "KKR", "LSG", "MI", "PBKS", "RR", "RCB", "SRH"]);

const MATCH_LABELS: Record<string, MatchLabelMeta> = {
  "9201": {
    season: "IPL 2024",
    matchNumber: 1,
    shortTeams: ["CSK", "RCB"],
    fullTeams: ["Chennai Super Kings", "Royal Challengers Bengaluru"],
  },
  "9202": {
    season: "IPL 2024",
    matchNumber: 2,
    shortTeams: ["MI", "GT"],
    fullTeams: ["Mumbai Indians", "Gujarat Titans"],
  },
  "9203": {
    season: "IPL 2024",
    matchNumber: 3,
    shortTeams: ["KKR", "SRH"],
    fullTeams: ["Kolkata Knight Riders", "Sunrisers Hyderabad"],
  },
  "9204": {
    season: "IPL 2024",
    matchNumber: 4,
    shortTeams: ["RR", "LSG"],
    fullTeams: ["Rajasthan Royals", "Lucknow Super Giants"],
  },
  "9205": {
    season: "IPL 2024",
    matchNumber: 5,
    shortTeams: ["PBKS", "DC"],
    fullTeams: ["Punjab Kings", "Delhi Capitals"],
  },
  "9206": {
    season: "IPL 2024",
    matchNumber: 6,
    shortTeams: ["RCB", "KKR"],
    fullTeams: ["Royal Challengers Bengaluru", "Kolkata Knight Riders"],
  },
  "9207": {
    season: "IPL 2024",
    matchNumber: 7,
    shortTeams: ["MI", "CSK"],
    fullTeams: ["Mumbai Indians", "Chennai Super Kings"],
  },
  "9208": {
    season: "IPL 2024",
    matchNumber: 8,
    shortTeams: ["GT", "SRH"],
    fullTeams: ["Gujarat Titans", "Sunrisers Hyderabad"],
  },
  "9209": {
    season: "IPL 2024",
    matchNumber: 9,
    shortTeams: ["RR", "PBKS"],
    fullTeams: ["Rajasthan Royals", "Punjab Kings"],
  },
  "9210": {
    season: "IPL 2024",
    matchNumber: 10,
    shortTeams: ["LSG", "DC"],
    fullTeams: ["Lucknow Super Giants", "Delhi Capitals"],
  },
};

function formatTeams(teams?: [string, string]) {
  return teams ? `${teams[0]} vs ${teams[1]}` : null;
}

function humanizeDisplayId(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  const normalizeTeamToken = (team: string) => {
    const compact = String(team || "").trim().replace(/\s+/g, "").toUpperCase();
    if (!compact) {
      return "";
    }

    if (compact.endsWith("W")) {
      const stripped = compact.slice(0, -1);
      if (IPL_TEAM_CODES.has(stripped)) {
        return stripped;
      }
    }

    return compact;
  };

  const spaced = text.replace(
    /\b([A-Za-z0-9]{2,10})\s+vs\s+([A-Za-z0-9]{2,10})\b/gi,
    (_, left: string, right: string) => `${normalizeTeamToken(left)} vs ${normalizeTeamToken(right)}`
  );

  const expanded = spaced.replace(
    /([A-Za-z0-9]{2,10})vs([A-Za-z0-9]{2,10})/g,
    (_, left: string, right: string) => `${normalizeTeamToken(left)} vs ${normalizeTeamToken(right)}`
  );
  return expanded || text;
}

function normalizeMatchText(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  return humanizeDisplayId(text.replace(/\b([A-Za-z0-9]{2,10})\s*vs\s*([A-Za-z0-9]{2,10})\b/gi, "$1vs$2"));
}

export function formatMatchLabel(
  matchId?: string | null,
  format: MatchLabelFormat = "standard",
  overrideMeta?: MatchLabelOverrideMeta | null
) {
  if (!matchId) {
    return "Match Update";
  }

  const meta = MATCH_LABELS[matchId];

  const compactFromDb =
    normalizeMatchText(overrideMeta?.shortTitle) ||
    humanizeDisplayId(overrideMeta?.displayId) ||
    null;
  const fullFromDb =
    normalizeMatchText(overrideMeta?.title) ||
    normalizeMatchText(overrideMeta?.shortTitle) ||
    humanizeDisplayId(overrideMeta?.displayId) ||
    null;

  const compactFromHardcoded = formatTeams(meta?.shortTeams);
  const fullFromHardcoded = formatTeams(meta?.fullTeams);

  const compactLabel =
    compactFromDb || compactFromHardcoded || fullFromHardcoded || matchId;
  const fullLabel =
    fullFromDb || fullFromHardcoded || compactFromHardcoded || matchId;

  if (format === "compact") {
    return compactLabel;
  }

  if (format === "full") {
    if (meta?.matchNumber && fullLabel) {
      const season = overrideMeta?.season?.trim() || meta.season;
      return `${season} Match ${meta.matchNumber} · ${fullLabel}`;
    }
    return fullLabel;
  }

  if (meta?.matchNumber && compactLabel) {
    return `Match ${meta.matchNumber} · ${compactLabel}`;
  }

  return fullLabel;
}
