"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { basePath } from "@/lib/basePath";
import { deriveLeagueData } from "@/lib/leagueData";
import type { DashboardTeam } from "@/components/dashboard/types";

export function useLeagueData(intervalMs = 5000) {
  const { data: session, status } = useSession();
  const [teams, setTeams] = useState<DashboardTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchTeams = async () => {
      try {
        const res = await fetch(`${basePath}/api/teams`, { cache: "no-store" });
        const data = await res.json();
        if (active) {
          setTeams(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error(error);
      } finally {
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

  const derived = useMemo(() => deriveLeagueData(teams), [teams]);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const isAdmin = session?.user?.name === "admin";

  return {
    teams,
    setTeams,
    loading: loading || status === "loading",
    session,
    currentUserId,
    isAdmin,
    derived,
  };
}

