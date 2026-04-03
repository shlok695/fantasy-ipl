"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { basePath } from "@/lib/basePath";
import { deriveLeagueData } from "@/lib/leagueData";
import type { DashboardTeam } from "@/components/dashboard/types";
import type { AggregatedPlayer } from "@/lib/leagueData";

type LeagueLeadersResponse = {
  orangeCapHolder?: AggregatedPlayer | null;
  purpleCapHolder?: AggregatedPlayer | null;
};

export function useLeagueData(intervalMs = 5000) {
  const { data: session, status } = useSession();
  const [teams, setTeams] = useState<DashboardTeam[]>([]);
  const [leaders, setLeaders] = useState<LeagueLeadersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchTeams = async () => {
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

        const data =
          teamsRes.status === "fulfilled" ? await teamsRes.value.json() : [];
        const leadersData =
          leadersRes.status === "fulfilled" ? await leadersRes.value.json() : null;

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
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchTeams();
    const interval = window.setInterval(fetchTeams, intervalMs);

    return () => {
      active = false;
      window.clearInterval(interval);
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
