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
  created_at: string;
  updated_at: string;
};
