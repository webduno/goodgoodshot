import { isValidBiomeId } from "@/lib/game/biomes";
import type { SessionBiomeChoice } from "@/lib/game/sessionBattleMaps";

/** DB → client; missing/legacy rows behave like random. */
export function parsePvpRoomBiomeChoice(
  raw: string | null | undefined
): SessionBiomeChoice {
  if (raw == null || raw === "" || raw === "random") return "random";
  if (isValidBiomeId(raw)) return raw;
  return "random";
}
