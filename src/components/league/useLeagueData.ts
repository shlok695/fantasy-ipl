"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { basePath } from "@/lib/basePath";
import { deriveLeagueData } from "@/lib/leagueData";
import type { DashboardTeam } from "@/components/dashboard/types";
import type { AggregatedPlayer } from "@/lib/leagueData";

type LeagueLeadersResponse = {
  orangeCapHolder?: AggregatedPlayer | null;
  purpleCapHolder?: AggregatedPlayer | null;
};

type LeagueVersionResponse = {
  version?: string | null;
};

const DEFAULT_REFRESH_INTERVAL_MS = 30_000;
const MIN_REFRESH_INTERVAL_MS = 15_000;
const LEAGUE_SNAPSHOT_CACHE_KEY = "fantasy-ipl:league-snapshot";
const SNAPSHOT_TIMEOUT_MS = 20_000;
const VERSION_TIMEOUT_MS = 10_000;
const BOOTSTRAP_RETRY_DELAYS_MS = [600, 1400, 2600];

type CachedLeagueSnapshot = {
  teams: DashboardTeam[];
  leaders: LeagueLeadersResponse | null;
};

function getRefreshIntervalMs(value: number | undefined) {
  const envInterval = Number.parseInt(
    process.env.NEXT_PUBLIC_LEAGUE_REFRESH_INTERVAL_MS || "",
    10
  );
  const requestedInterval = typeof value === "number" && Number.isFinite(value)
    ? value
    : Number.isFinite(envInterval)
      ? envInterval
      : DEFAULT_REFRESH_INTERVAL_MS;

  return Math.max(requestedInterval, MIN_REFRESH_INTERVAL_MS);
}

function readCachedLeagueSnapshot(): CachedLeagueSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(LEAGUE_SNAPSHOT_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<CachedLeagueSnapshot>;
    if (!Array.isArray(parsed.teams)) {
      return null;
    }

    return {
      teams: parsed.teams,
      leaders: parsed.leaders && typeof parsed.leaders === "object" ? parsed.leaders : null,
    };
  } catch {
    return null;
  }
}

function writeCachedLeagueSnapshot(snapshot: CachedLeagueSnapshot) {
  try {
    window.sessionStorage.setItem(LEAGUE_SNAPSHOT_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Best-effort cache only. Quota/privacy failures should not affect live data.
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function useLeagueData(intervalMs?: number) {
  const { data: session } = useSession();
  const [teams, setTeams] = useState<DashboardTeam[]>([]);
  const [leaders, setLeaders] = useState<LeagueLeadersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const latestVersionRef = useRef<string | null>(null);
  const snapshotInFlightRef = useRef(false);
  const versionInFlightRef = useRef(false);

  useEffect(() => {
    let active = true;

    const cachedSnapshot = readCachedLeagueSnapshot();
    if (cachedSnapshot) {
      setTeams(cachedSnapshot.teams);
      setLeaders(cachedSnapshot.leaders);
      setLoading(false);
    }

    const fetchLeagueSnapshot = async ({ keepLoading = false }: { keepLoading?: boolean } = {}) => {
      if (snapshotInFlightRef.current) {
        return false;
      }

      snapshotInFlightRef.current = true;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), SNAPSHOT_TIMEOUT_MS);
      let snapshotLoaded = false;

      try {
        const [teamsRes, leadersRes] = await Promise.allSettled([
          fetch(`${basePath}/api/teams`, {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch(`${basePath}/api/leaders`, {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        if (teamsRes.status !== "fulfilled" || !teamsRes.value.ok) {
          const status = teamsRes.status === "fulfilled" ? teamsRes.value.status : "request failed";
          throw new Error(`Unable to load league teams (${status})`);
        }

        const data = await teamsRes.value.json();
        const leadersData = leadersRes.status === "fulfilled" && leadersRes.value.ok
          ? await leadersRes.value.json()
          : null;
        const nextTeams = Array.isArray(data) ? data : [];
        const nextLeaders =
          leadersData &&
          typeof leadersData === "object" &&
          ("orangeCapHolder" in leadersData || "purpleCapHolder" in leadersData)
            ? {
                orangeCapHolder: (leadersData as LeagueLeadersResponse).orangeCapHolder ?? null,
                purpleCapHolder: (leadersData as LeagueLeadersResponse).purpleCapHolder ?? null,
              }
            : null;

        if (active) {
          setTeams(nextTeams);
          setLeaders(nextLeaders);
          writeCachedLeagueSnapshot({ teams: nextTeams, leaders: nextLeaders });
        }
        snapshotLoaded = true;
      } catch (error) {
        console.error("Failed to load league snapshot", error);
      } finally {
        window.clearTimeout(timeoutId);
        snapshotInFlightRef.current = false;
        if (active) {
          if (!keepLoading) {
            setLoading(false);
          }
        }
      }

      return snapshotLoaded;
    };

    const checkLeagueVersion = async () => {
      if (versionInFlightRef.current) {
        return;
      }

      versionInFlightRef.current = true;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), VERSION_TIMEOUT_MS);

      try {
        const response = await fetch(`${basePath}/api/league-version`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as LeagueVersionResponse;
        const nextVersion = typeof data.version === "string" ? data.version : null;

        if (!nextVersion) {
          return;
        }

        if (latestVersionRef.current === null) {
          latestVersionRef.current = nextVersion;
          return;
        }

        if (latestVersionRef.current !== nextVersion) {
          latestVersionRef.current = nextVersion;
          await fetchLeagueSnapshot();
        }
      } catch (error) {
        console.error(error);
      } finally {
        window.clearTimeout(timeoutId);
        versionInFlightRef.current = false;
      }
    };

    const bootstrap = async () => {
      let loaded = await fetchLeagueSnapshot({ keepLoading: true });

      for (const retryDelay of BOOTSTRAP_RETRY_DELAYS_MS) {
        if (loaded || !active) {
          break;
        }

        await delay(retryDelay);
        loaded = await fetchLeagueSnapshot({ keepLoading: true });
      }

      await checkLeagueVersion();

      if (active) {
        setLoading(false);
      }
    };

    void bootstrap();

    const refreshIntervalMs = getRefreshIntervalMs(intervalMs);
    const versionInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void checkLeagueVersion();
      }
    }, refreshIntervalMs);
    const fallbackInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchLeagueSnapshot();
      }
    }, Math.max(refreshIntervalMs * 4, 120_000));
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") {
        void fetchLeagueSnapshot({ keepLoading: true });
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      active = false;
      window.clearInterval(versionInterval);
      window.clearInterval(fallbackInterval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [intervalMs]);

  const derived = useMemo(
    () =>
      deriveLeagueData(
        teams,
        leaders
          ? {
              orangeCapHolder: leaders.orangeCapHolder ?? undefined,
              purpleCapHolder: leaders.purpleCapHolder ?? undefined,
            }
          : undefined
      ),
    [teams, leaders]
  );
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const isAdmin = session?.user?.name === "admin";

  return {
    teams,
    setTeams,
    loading,
    session,
    currentUserId,
    isAdmin,
    derived,
  };
}
