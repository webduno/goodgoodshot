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
  {
    id: "pandaFace",
    displayName: "Panda Face Hat",
    priceCoins: 1,
  },
  {
    id: "messengerMini",
    displayName: "Mini Messenger Hat",
    priceCoins: 1,
  },
  {
    id: "topHat",
    displayName: "Top Hat",
    priceCoins: 1,
  },
  {
    id: "simsPlumbob",
    displayName: "Plumbob Hat",
    priceCoins: 1,
  },
  {
    id: "bunnyEars",
    displayName: "Bunny Ears Hat",
    priceCoins: 1,
  },
  {
    id: "crownHat",
    displayName: "Crown Hat",
    priceCoins: 1,
  },
];
