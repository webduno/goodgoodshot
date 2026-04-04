"use client";

import {
  vehicleChargeMs,
  vehicleShotCooldownMs,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";

import {
  hudFont,
  powerupSlotStyle,
  progressFillStyle,
  progressTrack,
} from "@/components/gameHudStyles";

import { PowerupHudIcon } from "@/components/game/cube/hud/PowerupHudIcon";
import { POWERUP_SLOTS } from "@/lib/game/constants";

export function ShotHud({
  shotInFlight,
  cooldownUntil,
  chargeHud,
  powerupCharges,
  onPowerup,
  vehicle,
}: {
  shotInFlight: boolean;
  cooldownUntil: number | null;
  chargeHud: { remainingMs: number; clicks: number } | null;
  powerupCharges: number;
  onPowerup: () => void;
  vehicle: PlayerVehicleConfig;
}) {
  const chargeMs = vehicleChargeMs(vehicle);
  const cooldownMs = vehicleShotCooldownMs(vehicle);
  const remainingMs =
    cooldownUntil !== null ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const inCooldown = cooldownUntil !== null && remainingMs > 0;
  const progress =
    inCooldown && cooldownMs > 0 ? remainingMs / cooldownMs : 0;
  const charging = chargeHud !== null;
  const chargeProgress =
    charging && chargeMs > 0 ? chargeHud.remainingMs / chargeMs : 0;
  const canUsePowerup =
    charging && !shotInFlight && powerupCharges > 0;

  if (charging && !shotInFlight && chargeHud) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 6,
          width: "100%",
          pointerEvents: "none",
          userSelect: "none",
          ...hudFont,
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 4,
              width: "100%",
            }}
          >
            {POWERUP_SLOTS.map((slot) => {
              if (slot.implemented) {
                return (
                  <button
                    key={slot.id}
                    type="button"
                    aria-label={`${slot.name}: multiply strength by 2 for this shot (${powerupCharges} charges left)`}
                    title={`${slot.name}: ×2 per tap · ${powerupCharges} charge${powerupCharges === 1 ? "" : "s"}`}
                    disabled={!canUsePowerup}
                    onClick={onPowerup}
                    style={powerupSlotStyle({
                      variant: canUsePowerup ? "ready" : "depleted",
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
                      {powerupCharges}
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
        </div>
        <div style={{ ...progressTrack, overflow: "hidden" }}>
          <div style={progressFillStyle(chargeProgress, "charge")} />
        </div>
      </div>
    );
  }

  if (inCooldown && !shotInFlight && !charging) {
    return (
      <div
        style={{
          width: "100%",
          pointerEvents: "none",
          ...hudFont,
        }}
      >
        <div style={{ ...progressTrack, overflow: "hidden" }}>
          <div style={progressFillStyle(progress, "cooldown")} />
        </div>
      </div>
    );
  }

  return null;
}
