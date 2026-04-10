/** Shop footprint center on the plaza turf (world XZ), away from edge portals. */
export const PLAZA_SHOP_WORLD_X = -10;
export const PLAZA_SHOP_WORLD_Z = 12;

/** Ball landing within this radius (XZ) opens the shop when the shot settles. */
export const PLAZA_SHOP_LAND_TRIGGER_RADIUS = 4.2;

export function isNearPlazaShop(wx: number, wz: number): boolean {
  const dx = wx - PLAZA_SHOP_WORLD_X;
  const dz = wz - PLAZA_SHOP_WORLD_Z;
  return Math.hypot(dx, dz) <= PLAZA_SHOP_LAND_TRIGGER_RADIUS;
}

/**
 * Aquarium center relative to the plaza hub island origin — must stay in sync with
 * `PlazaFrutigerAeroDecor` (`aquCx` / `aquCz`).
 */
export const PLAZA_AQUARIUM_ISLAND_OFFSET_X = 17;
export const PLAZA_AQUARIUM_ISLAND_OFFSET_Z = -11;

/** Same radius idea as the main shop: ball settles near the aquarium footprint. */
export const PLAZA_AQUARIUM_SHOP_LAND_TRIGGER_RADIUS = 4.2;

export function isNearPlazaAquariumShop(
  wx: number,
  wz: number,
  islandWorldX: number,
  islandWorldZ: number
): boolean {
  const cx = islandWorldX + PLAZA_AQUARIUM_ISLAND_OFFSET_X;
  const cz = islandWorldZ + PLAZA_AQUARIUM_ISLAND_OFFSET_Z;
  const dx = wx - cx;
  const dz = wz - cz;
  return Math.hypot(dx, dz) <= PLAZA_AQUARIUM_SHOP_LAND_TRIGGER_RADIUS;
}

/**
 * Bird shop / aviary center relative to the plaza hub island — keep in sync with
 * `PlazaFrutigerAeroDecor` (`birdAviary.cx` / `birdAviary.cz`).
 */
export const PLAZA_BIRD_SHOP_ISLAND_OFFSET_X = -17;
export const PLAZA_BIRD_SHOP_ISLAND_OFFSET_Z = -11;

export const PLAZA_BIRD_SHOP_LAND_TRIGGER_RADIUS = 4.2;

export function isNearPlazaBirdShop(
  wx: number,
  wz: number,
  islandWorldX: number,
  islandWorldZ: number
): boolean {
  const cx = islandWorldX + PLAZA_BIRD_SHOP_ISLAND_OFFSET_X;
  const cz = islandWorldZ + PLAZA_BIRD_SHOP_ISLAND_OFFSET_Z;
  const dx = wx - cx;
  const dz = wz - cz;
  return Math.hypot(dx, dz) <= PLAZA_BIRD_SHOP_LAND_TRIGGER_RADIUS;
}
