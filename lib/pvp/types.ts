export type PvpRoomStatus = "waiting" | "playing" | "finished";

export type PvpMatchMode = "pvp" | "pve";

export type PvpRoomRow = {
  id: string;
  status: PvpRoomStatus;
  host_user_id: string;
  guest_user_id: string | null;
  current_turn_user_id: string | null;
  winner_user_id: string | null;
  course_seed: number;
  /** Omitted on DBs before migration; treat as `pvp`. */
  match_mode?: PvpMatchMode;
  host_vehicle_id?: string;
  guest_vehicle_id?: string;
  host_spawn_x?: number;
  host_spawn_y?: number;
  host_spawn_z?: number;
  guest_spawn_x?: number | null;
  guest_spawn_y?: number | null;
  guest_spawn_z?: number | null;
  created_at: string;
  updated_at: string;
  /** Newline-separated log; omitted before chat migration. */
  chat_text?: string;
};

/** Row from `pvp_player_ratings` (Elo + aggregate record). */
export type PvpPlayerRatingRow = {
  user_id: string;
  elo: number;
  matches_played: number;
  wins: number;
  losses: number;
  updated_at: string;
};

/** One finished match: per-player stats + Elo before/after (for leaderboards / history). */
export type PvpMatchResultRow = {
  id: string;
  room_id: string;
  host_user_id: string;
  guest_user_id: string;
  winner_user_id: string;
  end_reason: "hit" | "leave";
  course_seed: number;
  host_vehicle_id: string | null;
  guest_vehicle_id: string | null;
  host_elo_before: number;
  host_elo_after: number;
  guest_elo_before: number;
  guest_elo_after: number;
  host_shots: number;
  guest_shots: number;
  host_hits: number;
  guest_hits: number;
  host_misses: number;
  guest_misses: number;
  host_penalties: number;
  guest_penalties: number;
  host_enemy_losses: number;
  guest_enemy_losses: number;
  finished_at: string;
};
