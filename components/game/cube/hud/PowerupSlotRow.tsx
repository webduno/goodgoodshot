"use client";

import {
  hudFont,
  powerupSlotStyle,
} from "@/components/gameHudStyles";
import { PowerupHudIcon } from "@/components/game/cube/hud/PowerupHudIcon";
import { POWERUP_SLOTS } from "@/lib/game/constants";
import type { PowerupSlotId } from "@/lib/game/types";

function implementedCharges(
  slotId: PowerupSlotId,
  strengthCharges: number,
  noBounceCharges: number,
  noWindCharges: number,
  guidelineCharges: number
): number {
  switch (slotId) {
    case "strength":
      return strengthCharges;
    case "noBounce":
      return noBounceCharges;
    case "nowind":
      return noWindCharges;
    case "guideline":
      return guidelineCharges;
    default:
      return 0;
  }
}

function implementedAccent(
  slotId: PowerupSlotId
): "strength" | "noBounce" | "nowind" | "guideline" | undefined {
  if (
    slotId === "strength" ||
    slotId === "noBounce" ||
    slotId === "nowind" ||
    slotId === "guideline"
  ) {
    return slotId;
  }
  return undefined;
}

/** Two lines for "No bounce" / "No wind" so labels fit the narrow flyout. */
function powerupNameLines(name: string): [string, string | undefined] {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return [name, undefined];
  return [parts[0]!, parts.slice(1).join(" ")];
}

export function PowerupSlotRow({
  strengthCharges,
  noBounceCharges,
  noWindCharges,
  guidelineCharges,
  canUseStrength,
  canUseNoBounce,
  canUseNoWind,
  canUseGuideline,
  canAffordBuy,
  onPowerup,
  onBuyPowerupCharge,
}: {
  strengthCharges: number;
  noBounceCharges: number;
  noWindCharges: number;
  guidelineCharges: number;
  canUseStrength: boolean;
  canUseNoBounce: boolean;
  canUseNoWind: boolean;
  canUseGuideline: boolean;
  canAffordBuy: boolean;
  onPowerup: (slotId: PowerupSlotId) => void;
  onBuyPowerupCharge: (slotId: PowerupSlotId) => void;
}) {
  const buyChipStyle = {
    width: "100%",
    padding: "2px 3px",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.85)",
    fontSize: 7,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    cursor: canAffordBuy ? ("pointer" as const) : ("not-allowed" as const),
    opacity: canAffordBuy ? 1 : 0.48,
    backgroundImage:
      "linear-gradient(165deg, rgba(255,255,255,0.5) 0%, rgba(200,230,255,0.35) 100%)",
    color: "#0c4a6e",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 2px 6px rgba(0, 55, 95, 0.15)",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 4,
        width: "100%",
        pointerEvents: "auto",
        userSelect: "none",
        ...hudFont,
      }}
    >
      {POWERUP_SLOTS.filter((s) => s.implemented).map((slot) => {
        const slotCharges = implementedCharges(
          slot.id,
          strengthCharges,
          noBounceCharges,
          noWindCharges,
          guidelineCharges
        );
        const slotReady =
          slot.id === "strength"
            ? canUseStrength
            : slot.id === "noBounce"
              ? canUseNoBounce
              : slot.id === "nowind"
                ? canUseNoWind
                : canUseGuideline;
        const ariaDetail =
          slot.id === "strength"
            ? `multiply launch strength by 2 for this shot (${strengthCharges} strength charges left)`
            : slot.id === "noBounce"
              ? `no bounce and no roll after landing for this shot (${noBounceCharges} no-bounce charges left)`
              : slot.id === "nowind"
                ? `ignore wind on the ball for this shot (${noWindCharges} no-wind charges left)`
                : `show a no-wind trajectory at full fire bar before you shoot, then actual power while charging (${guidelineCharges} guideline charges left)`;
        const buttonTitle =
          slot.id === "strength"
            ? `${slot.name}: ×2 per tap · ${strengthCharges} charge${strengthCharges === 1 ? "" : "s"}`
            : slot.id === "noBounce"
              ? `${slot.name}: one tap · ${noBounceCharges} charge${noBounceCharges === 1 ? "" : "s"}`
              : slot.id === "nowind"
                ? `${slot.name}: one tap · ${noWindCharges} charge${noWindCharges === 1 ? "" : "s"}`
                : `${slot.name}: one tap · ${guidelineCharges} charge${guidelineCharges === 1 ? "" : "s"}`;
        const [nameLine1, nameLine2] = powerupNameLines(slot.name);
        return (
          <div
            key={slot.id}
            style={{
              width: "100%",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <button
              type="button"
              aria-label={`Buy +1 ${slot.name} charge for 1 gold coin`}
              title={
                canAffordBuy
                  ? "Spend 1 gold coin for +1 charge"
                  : "Need 1 gold coin"
              }
              disabled={!canAffordBuy}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBuyPowerupCharge(slot.id);
              }}
              style={buyChipStyle}
            >
              Buy
            </button>
            <button
              type="button"
              aria-label={`${slot.name}: ${ariaDetail}`}
              title={buttonTitle}
              disabled={!slotReady}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPowerup(slot.id);
              }}
              style={{
                ...powerupSlotStyle({
                  variant: slotReady ? "ready" : "depleted",
                  accentSlot: implementedAccent(slot.id),
                }),
                flex: "0 0 auto",
                alignSelf: "stretch",
                width: "100%",
                minHeight: 0,
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: "4px 3px",
              }}
            >
              <PowerupHudIcon slotId={slot.id} color="currentColor" size={12} />
              <span
                style={{
                  textAlign: "center",
                  fontSize: 8,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  maxWidth: "100%",
                }}
              >
                {nameLine1}
                {nameLine2 != null ? (
                  <>
                    <br />
                    {nameLine2}
                  </>
                ) : null}
              </span>
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {slotCharges}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
