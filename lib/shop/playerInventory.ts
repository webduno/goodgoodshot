import { INITIAL_POWERUP_CHARGES } from "@/lib/game/constants";
import { isShopPurchasableVehicleId } from "@/lib/shop/vehicleCatalog";

export const PLAYER_SHOP_INVENTORY_KEY = "goodgoodshot.playerShopInventory.v1";

/** Dispatched on `window` after writes so all listeners reload from localStorage (same tab). */
export const PLAYER_SHOP_INVENTORY_CHANGE_EVENT =
  "goodgoodshot:playerShopInventory";

export type HatId = "glassPyramid" | "glassCube" | "glassSphere";

export type PlayerShopInventory = {
  strengthCharges: number;
  noBounceCharges: number;
  noWindCharges: number;
  ownedHats: HatId[];
  equippedHatId: HatId | null;
  /** Lowercase `v_id` strings from `data/defaultVehicles.json` (excludes free `default`). */
  ownedVehicleIds: string[];
};

export function defaultPlayerShopInventory(): PlayerShopInventory {
  return {
    strengthCharges: INITIAL_POWERUP_CHARGES,
    noBounceCharges: INITIAL_POWERUP_CHARGES,
    noWindCharges: INITIAL_POWERUP_CHARGES,
    ownedHats: [],
    equippedHatId: null,
    ownedVehicleIds: [],
  };
}

function isHatId(x: unknown): x is HatId {
  return (
    x === "glassPyramid" || x === "glassCube" || x === "glassSphere"
  );
}

function isValidOwnedVehicleId(x: unknown): x is string {
  return typeof x === "string" && isShopPurchasableVehicleId(x);
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

    return {
      strengthCharges,
      noBounceCharges,
      noWindCharges,
      ownedHats,
      equippedHatId,
      ownedVehicleIds,
    };
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
