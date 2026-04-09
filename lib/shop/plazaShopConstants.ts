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
