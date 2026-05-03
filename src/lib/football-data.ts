import "server-only";
import { env } from "./env";

const BASE = "https://api.football-data.org/v4";

type ApiTeam = {
  id: number | null;
  name: string | null;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
};

type ApiMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration: string;
    fullTime: { home: number | null; away: number | null };
    extraTime?: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
  homeTeamPlaceholder?: string;
  awayTeamPlaceholder?: string;
};

export type FootballDataMatch = ApiMatch;

export async function fetchAllMatches(): Promise<ApiMatch[]> {
  const url = `${BASE}/competitions/${env.FOOTBALL_DATA_COMPETITION}/matches`;
  const res = await fetch(url, {
    headers: { "X-Auth-Token": env.FOOTBALL_DATA_API_KEY },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data.org ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.matches ?? [];
}

export function deriveAdvancingTeamId(m: ApiMatch): number | null {
  if (m.status !== "FINISHED") return null;
  if (m.score.penalties && m.score.penalties.home != null && m.score.penalties.away != null) {
    return m.score.penalties.home > m.score.penalties.away
      ? m.homeTeam.id
      : m.awayTeam.id;
  }
  if (m.score.winner === "HOME_TEAM") return m.homeTeam.id;
  if (m.score.winner === "AWAY_TEAM") return m.awayTeam.id;
  return null;
}
