import type { AquariumId, FishId } from "@/lib/shop/playerInventory";

export const FISH_SHOP_ITEMS: {
  id: FishId;
  label: string;
  emoji: string;
  priceCoins: number;
}[] = [
  { id: "fishYellow", label: "Yellow fish", emoji: "🐠", priceCoins: 1 },
  { id: "fishBlue", label: "Blue fish", emoji: "🐟", priceCoins: 1 },
  { id: "fishRed", label: "Red fish", emoji: "🐡", priceCoins: 1 },
];

export const AQUARIUM_SHOP_ITEMS: {
  id: AquariumId;
  label: string;
  emoji: string;
  priceCoins: number;
}[] = [
  { id: "aquariumSmallCube", label: "Small cube aquarium", emoji: "🧊", priceCoins: 2 },
  {
    id: "aquariumMediumCube",
    label: "Medium cube aquarium",
    emoji: "📦",
    priceCoins: 3,
  },
  {
    id: "aquariumLargeCube",
    label: "Large cube aquarium",
    emoji: "🏢",
    priceCoins: 4,
  },
];
