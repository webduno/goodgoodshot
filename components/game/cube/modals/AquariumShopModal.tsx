"use client";

import {
  goldChipButtonStyle,
  helpModalCard,
  hudColors,
  hudFont,
  modalBackdrop,
} from "@/components/gameHudStyles";
import {
  AQUARIUM_SHOP_ITEMS,
  FISH_COLOR_HEX,
  FISH_SHOP_ITEMS,
} from "@/lib/shop/aquariumCatalog";
import type { AquariumId, FishId } from "@/lib/shop/playerInventory";
import { useCallback, useState, type CSSProperties } from "react";

type AquariumShopTab = "fish" | "aquariums";

const AQUARIUM_CATEGORY_TABS: { id: AquariumShopTab; label: string }[] = [
  { id: "fish", label: "Fish" },
  { id: "aquariums", label: "Aquariums" },
];

const shopTabBarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  padding: 4,
  borderRadius: 14,
  background: "linear-gradient(180deg, rgba(0, 72, 120, 0.07) 0%, rgba(0, 55, 95, 0.1) 100%)",
  border: "1px solid rgba(0, 114, 188, 0.14)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
};

function shopCategoryTabStyle(active: boolean): CSSProperties {
  return {
    ...hudFont,
    flex: 1,
    minWidth: 72,
    padding: "0.55rem 0.4rem",
    fontSize: 11,
    fontWeight: active ? 800 : 600,
    letterSpacing: "0.03em",
    borderRadius: 10,
    border: active
      ? "1px solid rgba(0, 114, 188, 0.22)"
      : "1px solid transparent",
    color: active ? hudColors.value : hudColors.muted,
    background: active
      ? "linear-gradient(180deg, #ffffff 0%, rgba(232, 246, 255, 0.94) 100%)"
      : "transparent",
    boxShadow: active
      ? "0 2px 6px rgba(0, 55, 95, 0.12), inset 0 1px 0 rgba(255,255,255,0.95)"
      : "none",
    cursor: "pointer",
    transition: "color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
  };
}

const shopGridStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
};

const shopItemEmojiStyle: CSSProperties = {
  fontSize: 28,
  lineHeight: 1,
  textAlign: "center",
  display: "block",
};

function coinButtonLabel(priceCoins: number): string {
  return priceCoins === 1 ? "1 coin" : `${priceCoins} coins`;
}

export function AquariumShopModal({
  open,
  onClose,
  goldCoins,
  ownedFishIds,
  equippedFishId,
  onEquipFish,
  ownedAquariumIds,
  onBuyFish,
  onBuyAquarium,
}: {
  open: boolean;
  onClose: () => void;
  goldCoins: number;
  ownedFishIds: readonly FishId[];
  equippedFishId: FishId | null;
  onEquipFish: (id: FishId | null) => void;
  ownedAquariumIds: readonly AquariumId[];
  onBuyFish: (id: FishId) => void;
  onBuyAquarium: (id: AquariumId) => void;
}) {
  const [tab, setTab] = useState<AquariumShopTab>("fish");

  const resetTab = useCallback(() => setTab("fish"), []);

  if (!open) return null;

  const fishOwned = (id: FishId) => ownedFishIds.includes(id);
  const aquariumOwned = (id: AquariumId) => ownedAquariumIds.includes(id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aquarium-shop-title"
      style={modalBackdrop}
      onClick={() => {
        resetTab();
        onClose();
      }}
    >
      <div
        style={{
          ...helpModalCard,
          maxWidth: 420,
          width: "min(92vw, 420px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="aquarium-shop-title"
          style={{
            margin: "0 0 8px",
            fontSize: 18,
            fontWeight: 800,
            color: hudColors.value,
            letterSpacing: "0.02em",
          }}
        >
          Aquarium shop
          <span
            style={{
              margin: "0 0 12px 16px",
              fontSize: 12,
              fontWeight: 600,
              color: hudColors.muted,
              background: "#eeeeee",
              borderRadius: 10,
              padding: "4px 8px",
            }}
          >
            🪙 Coins:{" "}
            <span style={{ color: hudColors.accent, fontWeight: 800 }}>
              {goldCoins}
            </span>
          </span>
        </h2>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            fontWeight: 600,
            color: hudColors.muted,
            lineHeight: 1.45,
          }}
        >
          Fish and cube aquariums are stored in your plaza inventory. Equip one
          fish to show a small companion orbiting your vehicle in play.
        </p>

        <div
          role="tablist"
          aria-label="Aquarium shop categories"
          style={{
            ...shopTabBarStyle,
            marginBottom: 12,
          }}
        >
          {AQUARIUM_CATEGORY_TABS.map(({ id, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                id={`aquarium-shop-tab-${id}`}
                onClick={() => setTab(id)}
                style={shopCategoryTabStyle(active)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {tab === "fish" && (
          <ul style={shopGridStyle}>
            {FISH_SHOP_ITEMS.map((row) => {
              const owned = fishOwned(row.id);
              const equipped = equippedFishId === row.id;
              return (
                <li
                  key={row.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 6,
                    minHeight: 96,
                    padding: "8px 8px",
                    borderRadius: 12,
                    border: equipped
                      ? "1px solid rgba(34, 197, 94, 0.55)"
                      : "1px solid rgba(0, 55, 95, 0.18)",
                    background: equipped
                      ? "linear-gradient(180deg, rgba(220, 252, 231, 0.65) 0%, rgba(255,255,255,0.72) 100%)"
                      : "rgba(255,255,255,0.55)",
                    boxSizing: "border-box",
                    boxShadow: equipped
                      ? "0 0 12px rgba(34, 197, 94, 0.22), inset 0 1px 0 rgba(255,255,255,0.9)"
                      : undefined,
                  }}
                >
                  <span
                    style={{
                      ...shopItemEmojiStyle,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                    aria-hidden
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        background: FISH_COLOR_HEX[row.id],
                        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
                      }}
                    />
                    <span>{row.emoji}</span>
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: hudColors.value,
                      lineHeight: 1.25,
                      textAlign: "center",
                    }}
                  >
                    {row.label}
                  </span>
                  {owned ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        justifyContent: "center",
                        marginTop: "auto",
                      }}
                    >
                      {equipped ? (
                        <button
                          type="button"
                          onClick={() => onEquipFish(null)}
                          style={goldChipButtonStyle()}
                        >
                          Unequip
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onEquipFish(row.id)}
                          style={{
                            ...goldChipButtonStyle(),
                            boxShadow:
                              "inset 0 1px 0 rgba(255,255,255,0.55), 0 0 0 2px rgba(34, 197, 94, 0.65)",
                          }}
                        >
                          Equip
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onBuyFish(row.id)}
                      style={{
                        ...goldChipButtonStyle(),
                        width: "100%",
                        marginTop: "auto",
                      }}
                    >
                      {coinButtonLabel(row.priceCoins)}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {tab === "aquariums" && (
          <ul style={shopGridStyle}>
            {AQUARIUM_SHOP_ITEMS.map((row) => {
              const owned = aquariumOwned(row.id);
              return (
                <li
                  key={row.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 6,
                    minHeight: 96,
                    padding: "8px 8px",
                    borderRadius: 12,
                    border: "1px solid rgba(0, 55, 95, 0.18)",
                    background: "rgba(255,255,255,0.55)",
                    boxSizing: "border-box",
                  }}
                >
                  <span style={shopItemEmojiStyle} aria-hidden>
                    {row.emoji}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: hudColors.value,
                      lineHeight: 1.25,
                      textAlign: "center",
                    }}
                  >
                    {row.label}
                  </span>
                  {owned ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#15803d",
                        textAlign: "center",
                        marginTop: "auto",
                      }}
                    >
                      In inventory
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onBuyAquarium(row.id)}
                      style={{
                        ...goldChipButtonStyle(),
                        width: "100%",
                        marginTop: "auto",
                      }}
                    >
                      {coinButtonLabel(row.priceCoins)}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => {
              resetTab();
              onClose();
            }}
            style={goldChipButtonStyle()}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
