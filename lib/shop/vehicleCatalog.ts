import {
  DEFAULT_V_ID,
  PREDETERMINED_VEHICLES,
} from "@/components/playerVehicleConfig";

/**
 * Shop-only vehicles: `default` is free; each other predetermined vehicle costs
 * 10, then 15, 20, … (+5 per row in `defaultVehicles.json` order).
 */
export const VEHICLE_SHOP_CATALOG: readonly {
  id: string;
  displayName: string;
  priceCoins: number;
}[] = PREDETERMINED_VEHICLES.filter(
  (v) => v.id.trim().toLowerCase() !== DEFAULT_V_ID
).map((v, index) => ({
  id: v.id,
  displayName: v.name,
  priceCoins: 10 + index * 5,
}));

const priceById = new Map<string, number>();
for (const row of VEHICLE_SHOP_CATALOG) {
  priceById.set(row.id.trim().toLowerCase(), row.priceCoins);
}

export function getVehicleShopPriceCoins(vehicleId: string): number | undefined {
  return priceById.get(vehicleId.trim().toLowerCase());
}

export function isShopPurchasableVehicleId(vehicleId: string): boolean {
  return priceById.has(vehicleId.trim().toLowerCase());
}
