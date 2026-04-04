"use client";

import {
  hudFont,
  powerupSlotStyle,
} from "@/components/gameHudStyles";
import { PowerupHudIcon } from "@/components/game/cube/hud/PowerupHudIcon";
import { POWERUP_SLOTS } from "@/lib/game/constants";
import type { PowerupSlotId } from "@/lib/game/types";

export function PowerupSlotRow({
  strengthCharges,
  noBounceCharges,
  canUseStrength,
  canUseNoBounce,
  onPowerup,
}: {
  strengthCharges: number;
  noBounceCharges: number;
  canUseStrength: boolean;
  canUseNoBounce: boolean;
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
          const slotCharges =
            slot.id === "strength" ? strengthCharges : noBounceCharges;
          const slotReady =
            slot.id === "strength" ? canUseStrength : canUseNoBounce;
          const ariaDetail =
            slot.id === "strength"
              ? `multiply launch strength by 2 for this shot (${strengthCharges} strength charges left)`
              : `no bounce and no roll after landing for this shot (${noBounceCharges} no-bounce charges left)`;
          const buttonTitle =
            slot.id === "strength"
              ? `${slot.name}: ×2 per tap · ${strengthCharges} charge${strengthCharges === 1 ? "" : "s"}`
              : `${slot.name}: one tap · ${noBounceCharges} charge${noBounceCharges === 1 ? "" : "s"}`;
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
                accentSlot:
                  slot.id === "strength" || slot.id === "noBounce"
                    ? slot.id
                    : undefined,
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
