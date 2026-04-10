export type PvpRoomStatus = "waiting" | "playing" | "finished";

export type PvpRoomRow = {
  id: string;
  status: PvpRoomStatus;
  host_user_id: string;
  guest_user_id: string | null;
  current_turn_user_id: string | null;
  winner_user_id: string | null;
  course_seed: number;
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
};
