import { INITIAL_POWERUP_CHARGES } from "@/lib/game/constants";

export const PLAYER_SHOP_INVENTORY_KEY = "goodgoodshot.playerShopInventory.v1";

export type HatId = "glassPyramid" | "glassCube" | "glassSphere";

export type PlayerShopInventory = {
  strengthCharges: number;
  noBounceCharges: number;
  noWindCharges: number;
  ownedHats: HatId[];
  equippedHatId: HatId | null;
};

export function defaultPlayerShopInventory(): PlayerShopInventory {
  return {
    strengthCharges: INITIAL_POWERUP_CHARGES,
    noBounceCharges: INITIAL_POWERUP_CHARGES,
    noWindCharges: INITIAL_POWERUP_CHARGES,
    ownedHats: [],
    equippedHatId: null,
  };
}

function isHatId(x: unknown): x is HatId {
  return (
    x === "glassPyramid" || x === "glassCube" || x === "glassSphere"
  );
}

export function loadPlayerShopInventory(): PlayerShopInventory {
  if (typeof window === "undefined") return defaultPlayerShopInventory();
  try {
    const raw = localStorage.getItem(PLAYER_SHOP_INVENTORY_KEY);
    if (!raw) return defaultPlayerShopInventory();
    const parsed = JSON.parse(raw) as unknown;
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

    return {
      strengthCharges,
      noBounceCharges,
      noWindCharges,
      ownedHats,
      equippedHatId,
    };
  } catch {
    return defaultPlayerShopInventory();
  }
}

export function savePlayerShopInventory(state: PlayerShopInventory): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLAYER_SHOP_INVENTORY_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearPlayerShopInventory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PLAYER_SHOP_INVENTORY_KEY);
  } catch {
    /* ignore */
  }
}
