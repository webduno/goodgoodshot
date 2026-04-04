"use client";

import {
  DEFAULT_V_ID,
  PREDETERMINED_VEHICLES,
  rgbTupleToCss,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";
import * as THREE from "three";

import {
  goldChipButtonStyle,
  goldPillButtonStyle,
  helpModalCard,
  hudColors,
  modalBackdrop,
} from "@/components/gameHudStyles";
import { AIM_YAW_STEP_RAD, INITIAL_POWERUP_CHARGES } from "@/lib/game/constants";

export function HelpModal({
  open,
  onClose,
  vehicle,
}: {
  open: boolean;
  onClose: () => void;
  vehicle: PlayerVehicleConfig;
}) {
  if (!open) return null;

  const chargeSec = vehicle.secondsBeforeShotTrigger;
  const cooldownSec = vehicle.shotCooldownSeconds;
  const launchDeg = THREE.MathUtils.radToDeg(vehicle.launchAngleRad);
  const yawDeg = THREE.MathUtils.radToDeg(AIM_YAW_STEP_RAD);

  const reloadWithVehicle = (vId: string) => {
    const url = new URL(window.location.href);
    if (vId === DEFAULT_V_ID) {
      url.searchParams.delete("vehicle");
    } else {
      url.searchParams.set("vehicle", vId);
    }
    window.location.assign(url.toString());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      style={modalBackdrop}
      onClick={onClose}
    >
      <div
        style={helpModalCard}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="help-title"
          style={{
            margin: "0 0 10px",
            fontSize: 16,
            fontWeight: 700,
            color: hudColors.value,
          }}
        >
          Help
        </h2>
        <details>
          <summary
            style={{
              color: hudColors.value,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            How to play
          </summary>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              color: hudColors.label,
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: hudColors.value }}>Aim</strong> — ⇐ / ⇒
              jump a quarter turn; ← → nudge ({yawDeg.toFixed(0)}° per tap). The
              white wedge points where the shot goes.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: hudColors.value }}>Shoot</strong> — Click
              the spawn block. The first click starts a {chargeSec}s charge
              window.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: hudColors.value }}>Power</strong> — Extra
              clicks in that window add about +
              {Math.round(vehicle.extraClickStrengthFraction * 100)}% strength
              each. When the timer ends, the ball launches at {launchDeg.toFixed(0)}
              ° along your aim.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: hudColors.value }}>Power-ups</strong> —
              five slots in the aim panel (left to right). Only{" "}
              <strong style={{ color: hudColors.value }}>Strength</strong> is
              available for now.
              <ul
                style={{
                  margin: "8px 0 0",
                  paddingLeft: 16,
                  listStyleType: "disc",
                }}
              >
                <li style={{ marginBottom: 6 }}>
                  <strong style={{ color: hudColors.value }}>Strength</strong>{" "}
                  (lightning icon) — The number under the icon is how many charges
                  you have. Each tap multiplies launch strength by 2 for this shot
                  and spends one charge (you start with {INITIAL_POWERUP_CHARGES}).
                  Stacks multiply (2×, 4×, 8×, …).
                </li>
                <li style={{ marginBottom: 6, opacity: 0.85 }}>
                  <strong style={{ color: hudColors.value }}>Precision</strong>{" "}
                  (crosshair icon) — Coming soon: tighter aim so the ball tracks
                  closer to your wedge direction.
                </li>
                <li style={{ marginBottom: 6, opacity: 0.85 }}>
                  <strong style={{ color: hudColors.value }}>Time</strong> (clock
                  icon) — Coming soon: briefly extends the charge window.
                </li>
                <li style={{ marginBottom: 6, opacity: 0.85 }}>
                  <strong style={{ color: hudColors.value }}>Magnet</strong> (magnet
                  icon) — Coming soon: slight pull toward the goal while the ball is
                  in flight.
                </li>
                <li style={{ opacity: 0.85 }}>
                  <strong style={{ color: hudColors.value }}>Lucky</strong> (star
                  icon) — Coming soon: random bonus on goal contact or bounce.
                </li>
              </ul>
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: hudColors.value }}>Goal</strong> — Hit the
              green cube to finish the round. If you miss, you get a{" "}
              {cooldownSec}s cooldown; your spawn moves to where the ball landed.
            </li>
            <li>
              <strong style={{ color: hudColors.value }}>Camera</strong> — Drag to
              orbit, scroll to zoom.
            </li>
          </ul>
        </details>
        <details
          style={{
            marginTop: 14,
          }}
        >
          <summary
            style={{
              color: hudColors.value,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            Vehicles
          </summary>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {PREDETERMINED_VEHICLES.map((v) => {
              const isCurrent = v.id === vehicle.id;
              const mainCss = rgbTupleToCss(v.mainRgb);
              const accentCss = rgbTupleToCss(v.accentRgb);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => reloadWithVehicle(v.id)}
                  title={`Load ${v.name} and start a new round`}
                  style={{
                    ...goldChipButtonStyle(),
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "6px 12px",
                    backgroundImage: `linear-gradient(135deg, ${mainCss} 0%, ${accentCss} 100%)`,
                    border: "1px solid rgba(255,255,255,0.88)",
                    color: "#ffffff",
                    textShadow: "0 1px 2px rgba(0,0,0,0.55)",
                    ...(isCurrent
                      ? {
                          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), 0 3px 12px rgba(0,0,0,0.28), 0 0 0 2px ${accentCss}, 0 0 14px ${accentCss}`,
                        }
                      : {
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.35), 0 3px 10px rgba(0,0,0,0.22)",
                        }),
                  }}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 10,
              lineHeight: 1.4,
              color: hudColors.muted,
            }}
          >
            Picks the URL query and reloads the page so you start fresh with
            that vehicle&apos;s shot stats.
          </p>
        </details>
        <button
          type="button"
          onClick={onClose}
          style={{
            ...goldPillButtonStyle({ disabled: false, fullWidth: true }),
            marginTop: 14,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
