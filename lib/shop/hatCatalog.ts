import type { HatId } from "@/lib/shop/playerInventory";

export const HAT_CATALOG: readonly {
  id: HatId;
  displayName: string;
  priceCoins: number;
}[] = [
  {
    id: "glassPyramid",
    displayName: "Glass Pyramid Hat",
    priceCoins: 1,
  },
  {
    id: "glassCube",
    displayName: "Glass Cube Hat",
    priceCoins: 1,
  },
  {
    id: "glassSphere",
    displayName: "Glass Sphere Hat",
    priceCoins: 1,
  },
];
