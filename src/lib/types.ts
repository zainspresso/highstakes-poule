export type User = {
  id: string;
  display_name: string;
  pin_hash: string | null;
  is_admin: boolean;
  created_at: string;
};

export type Team = {
  id: number;
  name: string;
  short_code: string | null;
  flag_url: string | null;
};

export type MatchStatus = "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "SUSPENDED" | "CANCELLED";

export type Match = {
  id: number;
  stage: string;
  group_name: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  kickoff_at: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  advancing_team_id: number | null;
};

export type Prediction = {
  id: string;
  user_id: string;
  match_id: number;
  home_score: number;
  away_score: number;
  advancing_team_id: number | null;
  submitted_at: string;
  locked_at: string | null;
  points_exact: number;
  points_diff: number;
  points_outcome: number;
  points_advance: number;
  points_total: number;
};

export type ScoringConfig = {
  key: string;
  points: number;
  description: string;
};

export type BonusQuestion = {
  id: number;
  key: string;
  label: string;
  type: "top3_teams" | "player_name" | "integer";
  closes_at: string;
  resolved_value: unknown;
};

export type BonusPrediction = {
  id: string;
  user_id: string;
  question_id: number;
  value: unknown;
  points: number;
  submitted_at: string;
};
