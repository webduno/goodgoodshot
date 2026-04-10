import type { PlazaBirdId } from "@/lib/shop/playerInventory";

export const BIRD_SHOP_ITEMS: {
  id: PlazaBirdId;
  label: string;
  emoji: string;
  priceCoins: number;
}[] = [
  { id: "birdBee", label: "Bee", emoji: "🐝", priceCoins: 1 },
  { id: "birdColibri", label: "Colibri", emoji: "🐦", priceCoins: 1 },
  { id: "birdSparrow", label: "Sparrow", emoji: "🪶", priceCoins: 1 },
];
