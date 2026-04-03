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
    overrideMeta?.displayId?.trim() ||
    overrideMeta?.shortTitle?.trim() ||
    null;
  const fullFromDb =
    overrideMeta?.title?.trim() || compactFromDb || null;

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

  return compactLabel;
}
