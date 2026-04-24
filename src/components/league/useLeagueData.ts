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

    const fetchLeagueSnapshot = async ({ keepLoading = false }: { keepLoading?: boolean } = {}) => {
      if (snapshotInFlightRef.current) {
        return;
      }

      snapshotInFlightRef.current = true;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 10000);

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

        const data = teamsRes.status === "fulfilled" && teamsRes.value.ok
          ? await teamsRes.value.json()
          : [];
        const leadersData = leadersRes.status === "fulfilled" && leadersRes.value.ok
          ? await leadersRes.value.json()
          : null;

        if (active) {
          setTeams(Array.isArray(data) ? data : []);
          if (
            leadersData &&
            typeof leadersData === "object" &&
            ("orangeCapHolder" in leadersData || "purpleCapHolder" in leadersData)
          ) {
            setLeaders({
              orangeCapHolder: (leadersData as LeagueLeadersResponse).orangeCapHolder ?? null,
              purpleCapHolder: (leadersData as LeagueLeadersResponse).purpleCapHolder ?? null,
            });
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        window.clearTimeout(timeoutId);
        snapshotInFlightRef.current = false;
        if (active) {
          if (!keepLoading) {
            setLoading(false);
          }
        }
      }
    };

    const checkLeagueVersion = async () => {
      if (versionInFlightRef.current) {
        return;
      }

      versionInFlightRef.current = true;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 10000);

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
      await fetchLeagueSnapshot({ keepLoading: true });
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

    return () => {
      active = false;
      window.clearInterval(versionInterval);
      window.clearInterval(fallbackInterval);
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
