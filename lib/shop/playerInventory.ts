import { INITIAL_POWERUP_CHARGES } from "@/lib/game/constants";
import { isShopPurchasableVehicleId } from "@/lib/shop/vehicleCatalog";

export const PLAYER_SHOP_INVENTORY_KEY = "goodgoodshot.playerShopInventory.v1";

/** Dispatched on `window` after writes so all listeners reload from localStorage (same tab). */
export const PLAYER_SHOP_INVENTORY_CHANGE_EVENT =
  "goodgoodshot:playerShopInventory";

export type HatId = "glassPyramid" | "glassCube" | "glassSphere";

export type FishId = "fishYellow" | "fishBlue" | "fishRed";

/** Plaza bird shop — placement / gameplay hooks can be added later. */
export type PlazaBirdId = "birdBee" | "birdColibri" | "birdSparrow";

export type AquariumId =
  | "aquariumSmallCube"
  | "aquariumMediumCube"
  | "aquariumLargeCube";

export type PlayerShopInventory = {
  strengthCharges: number;
  noBounceCharges: number;
  noWindCharges: number;
  ownedHats: HatId[];
  equippedHatId: HatId | null;
  /** Lowercase `v_id` strings from `data/defaultVehicles.json` (excludes free `default`). */
  ownedVehicleIds: string[];
  ownedFishIds: FishId[];
  /** At most one cosmetic fish orbits the vehicle in-game (plaza + course + PvP). */
  equippedFishId: FishId | null;
  ownedPlazaBirdIds: PlazaBirdId[];
  ownedAquariumIds: AquariumId[];
};

export function defaultPlayerShopInventory(): PlayerShopInventory {
  return {
    strengthCharges: INITIAL_POWERUP_CHARGES,
    noBounceCharges: INITIAL_POWERUP_CHARGES,
    noWindCharges: INITIAL_POWERUP_CHARGES,
    ownedHats: [],
    equippedHatId: null,
    ownedVehicleIds: [],
    ownedFishIds: [],
    equippedFishId: null,
    ownedPlazaBirdIds: [],
    ownedAquariumIds: [],
  };
}

function isHatId(x: unknown): x is HatId {
  return (
    x === "glassPyramid" || x === "glassCube" || x === "glassSphere"
  );
}

function isFishId(x: unknown): x is FishId {
  return x === "fishYellow" || x === "fishBlue" || x === "fishRed";
}

function isPlazaBirdId(x: unknown): x is PlazaBirdId {
  return x === "birdBee" || x === "birdColibri" || x === "birdSparrow";
}

function isAquariumId(x: unknown): x is AquariumId {
  return (
    x === "aquariumSmallCube" ||
    x === "aquariumMediumCube" ||
    x === "aquariumLargeCube"
  );
}

function isValidOwnedVehicleId(x: unknown): x is string {
  return typeof x === "string" && isShopPurchasableVehicleId(x);
}

/** Parses shop inventory from JSON (localStorage or Supabase jsonb). */
export function parsePlayerShopInventoryFromUnknown(
  parsed: unknown
): PlayerShopInventory {
  if (!parsed || typeof parsed !== "object") return defaultPlayerShopInventory();
  const p = parsed as Record<string, unknown>;
  const base = defaultPlayerShopInventory();

  const strengthCharges =
    typeof p.strengthCharges === "number"
      ? Math.max(0, Math.floor(p.strengthCharges))
      : base.strengthCharges;
  const noBounceCharges =
    typeof p.noBounceCharges === "number"
      ? Math.max(0, Math.floor(p.noBounceCharges))
      : base.noBounceCharges;
  const noWindCharges =
    typeof p.noWindCharges === "number"
      ? Math.max(0, Math.floor(p.noWindCharges))
      : base.noWindCharges;

  let ownedHats: HatId[] = [];
  if (Array.isArray(p.ownedHats)) {
    ownedHats = p.ownedHats.filter(isHatId);
  }

  let equippedHatId: HatId | null = null;
  if (p.equippedHatId === null) {
    equippedHatId = null;
  } else if (isHatId(p.equippedHatId)) {
    equippedHatId = p.equippedHatId;
  }

  if (equippedHatId !== null && !ownedHats.includes(equippedHatId)) {
    equippedHatId = null;
  }

  let ownedVehicleIds: string[] = [];
  if (Array.isArray(p.ownedVehicleIds)) {
    const seen = new Set<string>();
    for (const raw of p.ownedVehicleIds) {
      if (!isValidOwnedVehicleId(raw)) continue;
      const id = raw.trim().toLowerCase();
      if (seen.has(id)) continue;
      seen.add(id);
      ownedVehicleIds.push(id);
    }
  }

  let ownedFishIds: FishId[] = [];
  if (Array.isArray(p.ownedFishIds)) {
    const seen = new Set<FishId>();
    for (const raw of p.ownedFishIds) {
      if (!isFishId(raw)) continue;
      if (seen.has(raw)) continue;
      seen.add(raw);
      ownedFishIds.push(raw);
    }
  }

  let equippedFishId: FishId | null = null;
  if (p.equippedFishId === null) {
    equippedFishId = null;
  } else if (isFishId(p.equippedFishId)) {
    equippedFishId = p.equippedFishId;
  }
  if (equippedFishId !== null && !ownedFishIds.includes(equippedFishId)) {
    equippedFishId = null;
  }

  let ownedPlazaBirdIds: PlazaBirdId[] = [];
  if (Array.isArray(p.ownedPlazaBirdIds)) {
    const seen = new Set<PlazaBirdId>();
    for (const raw of p.ownedPlazaBirdIds) {
      if (!isPlazaBirdId(raw)) continue;
      if (seen.has(raw)) continue;
      seen.add(raw);
      ownedPlazaBirdIds.push(raw);
    }
  }

  let ownedAquariumIds: AquariumId[] = [];
  if (Array.isArray(p.ownedAquariumIds)) {
    const seen = new Set<AquariumId>();
    for (const raw of p.ownedAquariumIds) {
      if (!isAquariumId(raw)) continue;
      if (seen.has(raw)) continue;
      seen.add(raw);
      ownedAquariumIds.push(raw);
    }
  }

  return {
    strengthCharges,
    noBounceCharges,
    noWindCharges,
    ownedHats,
    equippedHatId,
    ownedVehicleIds,
    ownedFishIds,
    equippedFishId,
    ownedPlazaBirdIds,
    ownedAquariumIds,
  };
}

/** Merges local + remote so nothing is lost when syncing across devices. */
export function mergePlayerShopInventoryWithRemote(
  local: PlayerShopInventory,
  remote: PlayerShopInventory
): PlayerShopInventory {
  const strengthCharges = Math.max(
    local.strengthCharges,
    remote.strengthCharges
  );
  const noBounceCharges = Math.max(
    local.noBounceCharges,
    remote.noBounceCharges
  );
  const noWindCharges = Math.max(local.noWindCharges, remote.noWindCharges);

  const ownedHats = [...new Set([...local.ownedHats, ...remote.ownedHats])];
  const ownedVehicleIds = [
    ...new Set([...local.ownedVehicleIds, ...remote.ownedVehicleIds]),
  ];
  const ownedFishIds = [...new Set([...local.ownedFishIds, ...remote.ownedFishIds])];
  const ownedPlazaBirdIds = [
    ...new Set([...local.ownedPlazaBirdIds, ...remote.ownedPlazaBirdIds]),
  ];
  const ownedAquariumIds = [
    ...new Set([...local.ownedAquariumIds, ...remote.ownedAquariumIds]),
  ];

  let equippedHatId: HatId | null = null;
  if (
    remote.equippedHatId !== null &&
    ownedHats.includes(remote.equippedHatId)
  ) {
    equippedHatId = remote.equippedHatId;
  } else if (
    local.equippedHatId !== null &&
    ownedHats.includes(local.equippedHatId)
  ) {
    equippedHatId = local.equippedHatId;
  }

  let equippedFishId: FishId | null = null;
  if (
    remote.equippedFishId !== null &&
    ownedFishIds.includes(remote.equippedFishId)
  ) {
    equippedFishId = remote.equippedFishId;
  } else if (
    local.equippedFishId !== null &&
    ownedFishIds.includes(local.equippedFishId)
  ) {
    equippedFishId = local.equippedFishId;
  }

  return {
    strengthCharges,
    noBounceCharges,
    noWindCharges,
    ownedHats,
    equippedHatId,
    ownedVehicleIds,
    ownedFishIds,
    equippedFishId,
    ownedPlazaBirdIds,
    ownedAquariumIds,
  };
}

export function loadPlayerShopInventory(): PlayerShopInventory {
  if (typeof window === "undefined") return defaultPlayerShopInventory();
  try {
    const raw = localStorage.getItem(PLAYER_SHOP_INVENTORY_KEY);
    if (!raw) return defaultPlayerShopInventory();
    const parsed = JSON.parse(raw) as unknown;
    return parsePlayerShopInventoryFromUnknown(parsed);
  } catch {
    return defaultPlayerShopInventory();
  }
}

export function savePlayerShopInventory(state: PlayerShopInventory): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLAYER_SHOP_INVENTORY_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(PLAYER_SHOP_INVENTORY_CHANGE_EVENT));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearPlayerShopInventory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PLAYER_SHOP_INVENTORY_KEY);
    window.dispatchEvent(new Event(PLAYER_SHOP_INVENTORY_CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}
