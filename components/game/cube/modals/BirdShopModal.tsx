"use client";

import {
  goldChipButtonStyle,
  helpModalCard,
  hudColors,
  hudFont,
  modalBackdrop,
} from "@/components/gameHudStyles";
import { BIRD_SHOP_ITEMS } from "@/lib/shop/birdCatalog";
import type { PlazaBirdId } from "@/lib/shop/playerInventory";
import { useCallback, type CSSProperties } from "react";

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

const BIRD_SWATCH: Record<PlazaBirdId, string> = {
  birdBee: "#fbbf24",
  birdColibri: "#22d3ee",
  birdSparrow: "#a8a29e",
};

function coinButtonLabel(priceCoins: number): string {
  return priceCoins === 1 ? "1 coin" : `${priceCoins} coins`;
}

export function BirdShopModal({
  open,
  onClose,
  goldCoins,
  ownedPlazaBirdIds,
  onBuyBird,
}: {
  open: boolean;
  onClose: () => void;
  goldCoins: number;
  ownedPlazaBirdIds: readonly PlazaBirdId[];
  onBuyBird: (id: PlazaBirdId) => void;
}) {
  const onBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open) return null;

  const birdOwned = (id: PlazaBirdId) => ownedPlazaBirdIds.includes(id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bird-shop-title"
      style={modalBackdrop}
      onClick={onBackdropClick}
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
          id="bird-shop-title"
          style={{
            margin: "0 0 8px",
            fontSize: 18,
            fontWeight: 800,
            color: hudColors.value,
            letterSpacing: "0.02em",
          }}
        >
          Bird shop
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
          Birds are stored in your plaza inventory. You can wire them into the
          scene or mechanics when you are ready.
        </p>

        <ul style={shopGridStyle}>
          {BIRD_SHOP_ITEMS.map((row) => {
            const owned = birdOwned(row.id);
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
                      background: BIRD_SWATCH[row.id],
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
                    onClick={() => onBuyBird(row.id)}
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

        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={goldChipButtonStyle()}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
