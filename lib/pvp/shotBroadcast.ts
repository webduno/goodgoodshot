/**
 * Sent over Supabase Realtime broadcast so the other client can replay the same
 * shot locally (ghost ball + camera follow) while the opponent is not the one simulating.
 */
export type PvpShotBroadcastPayload = {
  senderId: string;
  spawn: [number, number, number];
  clicks: number;
  worldAimYawRad: number;
  aimPitchOffsetRad: number;
  powerMultiplier: number;
  noBounce: boolean;
  windAx: number;
  windAz: number;
};
