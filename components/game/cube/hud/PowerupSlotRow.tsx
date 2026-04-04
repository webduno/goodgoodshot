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
  noWindCharges: number
): number {
  switch (slotId) {
    case "strength":
      return strengthCharges;
    case "noBounce":
      return noBounceCharges;
    case "nowind":
      return noWindCharges;
    default:
      return 0;
  }
}

function implementedAccent(
  slotId: PowerupSlotId
): "strength" | "noBounce" | "nowind" | undefined {
  if (slotId === "strength" || slotId === "noBounce" || slotId === "nowind") {
    return slotId;
  }
  return undefined;
}

export function PowerupSlotRow({
  strengthCharges,
  noBounceCharges,
  noWindCharges,
  canUseStrength,
  canUseNoBounce,
  canUseNoWind,
  onPowerup,
}: {
  strengthCharges: number;
  noBounceCharges: number;
  noWindCharges: number;
  canUseStrength: boolean;
  canUseNoBounce: boolean;
  canUseNoWind: boolean;
  onPowerup: (slotId: PowerupSlotId) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 4,
        width: "100%",
        pointerEvents: "auto",
        userSelect: "none",
        ...hudFont,
      }}
    >
      {POWERUP_SLOTS.map((slot) => {
        if (slot.implemented) {
          const slotCharges = implementedCharges(
            slot.id,
            strengthCharges,
            noBounceCharges,
            noWindCharges
          );
          const slotReady =
            slot.id === "strength"
              ? canUseStrength
              : slot.id === "noBounce"
                ? canUseNoBounce
                : canUseNoWind;
          const ariaDetail =
            slot.id === "strength"
              ? `multiply launch strength by 2 for this shot (${strengthCharges} strength charges left)`
              : slot.id === "noBounce"
                ? `no bounce and no roll after landing for this shot (${noBounceCharges} no-bounce charges left)`
                : `ignore wind on the ball for this shot (${noWindCharges} no-wind charges left)`;
          const buttonTitle =
            slot.id === "strength"
              ? `${slot.name}: ×2 per tap · ${strengthCharges} charge${strengthCharges === 1 ? "" : "s"}`
              : slot.id === "noBounce"
                ? `${slot.name}: one tap · ${noBounceCharges} charge${noBounceCharges === 1 ? "" : "s"}`
                : `${slot.name}: one tap · ${noWindCharges} charge${noWindCharges === 1 ? "" : "s"}`;
          return (
            <button
              key={slot.id}
              type="button"
              aria-label={`${slot.name}: ${ariaDetail}`}
              title={buttonTitle}
              disabled={!slotReady}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPowerup(slot.id);
              }}
              style={powerupSlotStyle({
                variant: slotReady ? "ready" : "depleted",
                accentSlot: implementedAccent(slot.id),
              })}
            >
              <PowerupHudIcon slotId={slot.id} color="currentColor" />
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 11,
                  lineHeight: 1,
                }}
              >
                {slotCharges}
              </span>
            </button>
          );
        }
        return (
          <button
            key={slot.id}
            type="button"
            aria-label={`${slot.name}: not available yet`}
            title={`${slot.name} — coming soon`}
            disabled
            style={powerupSlotStyle({ variant: "locked" })}
          >
            <PowerupHudIcon slotId={slot.id} color="currentColor" />
          </button>
        );
      })}
    </div>
  );
}
