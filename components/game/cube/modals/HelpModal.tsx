"use client";

import { usePlayerStats } from "@/components/PlayerStatsProvider";
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
import {
  AIM_PITCH_MAX_RAD,
  AIM_YAW_STEP_RAD,
  INITIAL_POWERUP_CHARGES,
} from "@/lib/game/constants";
import type { AimControlMode } from "@/lib/game/aimControlSettings";
import { clearPlaySession } from "@/lib/game/playSession";
import { clearPlayerStats } from "@/lib/playerStats/storage";
import {
  isVehicleUnlocked,
  PREMIUM_RATATA_VEHICLE_ID,
  shouldShowRatataBetaTag,
} from "@/lib/game/vehicleUnlock";

export function HelpModal({
  open,
  onClose,
  onOpenProfile,
  vehicle,
  retroTvEnabled,
  onRetroTvChange,
  guidelineEnabled,
  onGuidelineEnabledChange,
  aimControlMode,
  onAimControlModeChange,
}: {
  open: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  vehicle: PlayerVehicleConfig;
  retroTvEnabled: boolean;
  onRetroTvChange: (next: boolean) => void;
  guidelineEnabled: boolean;
  onGuidelineEnabledChange: (next: boolean) => void;
  aimControlMode: AimControlMode;
  onAimControlModeChange: (next: AimControlMode) => void;
}) {
  const { stats } = usePlayerStats();
  if (!open) return null;

  const chargeSec = vehicle.secondsBeforeShotTrigger;
  const cooldownSec = vehicle.shotCooldownSeconds;
  const launchDeg = THREE.MathUtils.radToDeg(vehicle.launchAngleRad);
  const yawDeg = THREE.MathUtils.radToDeg(AIM_YAW_STEP_RAD);
  const pitchMaxDeg = THREE.MathUtils.radToDeg(AIM_PITCH_MAX_RAD);

  const reloadWithVehicle = (vId: string) => {
    const url = new URL(window.location.href);
    if (vId === DEFAULT_V_ID) {
      url.searchParams.delete("vehicle");
    } else {
      url.searchParams.set("vehicle", vId);
    }
    window.location.assign(url.toString());
  };

  const clearAllSavedData = () => {
    if (
      !window.confirm(
        "Clear all saved progress, stats, and war data? The page will reload."
      )
    ) {
      return;
    }
    clearPlaySession();
    clearPlayerStats();
    const url = new URL(window.location.href);
    url.searchParams.delete("vehicle");
    window.location.assign(url.toString());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-title"
      style={modalBackdrop}
      onClick={onClose}
    >
      <style>{`
        .help-menu details > summary {
          list-style: none;
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 8px;
          padding: 10px 12px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: #002a42;
          text-shadow: 0 1px 0 rgba(255,255,255,0.55);
          user-select: none;
          border: 2px solid rgba(0, 55, 95, 0.28);
          background-image: linear-gradient(
            180deg,
            rgba(255,255,255,0.98) 0%,
            rgba(185, 228, 255, 0.65) 55%,
            rgba(120, 200, 245, 0.35) 100%
          );
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.75),
            inset 0 -2px 0 rgba(0, 60, 100, 0.12),
            0 3px 0 rgba(0, 45, 80, 0.16),
            0 6px 14px rgba(0, 55, 100, 0.14);
        }
        .help-menu details > summary::-webkit-details-marker {
          display: none;
        }
        .help-menu details > summary::before {
          content: "▶";
          flex-shrink: 0;
          font-size: 10px;
          line-height: 1;
          color: #0072bc;
          text-shadow: 0 1px 0 rgba(255,255,255,0.7);
          transition: transform 0.15s ease;
        }
        .help-menu details[open] > summary::before {
          transform: rotate(90deg);
        }
        .help-menu details + details {
          margin-top: 10px;
        }
      `}</style>
      <div
        className="help-menu"
        style={helpModalCard}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <h2
            id="menu-title"
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#001a2e",
              textShadow:
                "0 1px 0 rgba(255,255,255,0.85), 0 3px 0 rgba(0, 80, 130, 0.12)",
            }}
          >
            Menu
          </h2>
          <button
            type="button"
            aria-label="Open profile"
            onClick={onOpenProfile}
            style={goldChipButtonStyle()}
          >
            Profile
          </button>
        </div>
        <details>
          <summary>How to play</summary>
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
              jump a quarter turn; ← → nudge horizontally ({yawDeg.toFixed(0)}°
              per tap). ⇈ / ⇊ snap pitch; ↑ ↓ nudge vertically (±
              {pitchMaxDeg.toFixed(0)}° from this vehicle&apos;s base angle).{" "}
              <strong style={{ color: hudColors.value }}>WASD</strong> / arrow
              keys match ↑↓←→. The white wedge points where the shot goes.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: hudColors.value }}>Shoot</strong> — Use
              the <strong style={{ color: hudColors.value }}>Hold to shoot</strong>{" "}
              button or press <strong style={{ color: hudColors.value }}>Space</strong>.
              The first click (or Space) starts a {chargeSec}s charge window.
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
              tap the <strong style={{ color: hudColors.value }}>Power-ups</strong>{" "}
              button on the left when you are not charging to open the slot panel
              and pick boosts before your first click. Three slots (left to right):{" "}
              <strong style={{ color: hudColors.value }}>Strength</strong>,{" "}
              <strong style={{ color: hudColors.value }}>No bounce</strong>, and{" "}
              <strong style={{ color: hudColors.value }}>No wind</strong> are
              available; more slots are coming later. Trajectory{" "}
              <strong style={{ color: hudColors.value }}>Guideline</strong> is
              toggled under <strong style={{ color: hudColors.value }}>Menu</strong>{" "}
              → <strong style={{ color: hudColors.value }}>Game Config</strong>.
              <ul
                style={{
                  margin: "8px 0 0",
                  paddingLeft: 16,
                  listStyleType: "disc",
                }}
              >
                <li style={{ marginBottom: 6 }}>
                  <strong style={{ color: hudColors.value }}>Strength</strong>{" "}
                  (lightning icon) — The number under the icon is your{" "}
                  <strong style={{ color: hudColors.value }}>strength</strong>{" "}
                  charges only. Each tap multiplies launch strength by 2 for this
                  shot and spends one strength charge (you start with{" "}
                  {INITIAL_POWERUP_CHARGES}). Stacks multiply (2×, 4×, 8×, …).
                </li>
                <li style={{ marginBottom: 6 }}>
                  <strong style={{ color: hudColors.value }}>No bounce</strong>{" "}
                  (ball + floor line) — Uses a separate{" "}
                  <strong style={{ color: hudColors.value }}>no-bounce</strong>{" "}
                  pool (same starting count). One tap before the shot spends one
                  no-bounce charge and removes bounces and rolling for that shot:
                  the ball stops where it first touches the ground (no rebound, no
                  roll-out).
                </li>
                <li style={{ marginBottom: 6 }}>
                  <strong style={{ color: hudColors.value }}>No wind</strong>{" "}
                  — Separate charges (same starting count as the other boosts).
                  One tap before the shot spends one charge and removes wind
                  effects on the ball for that shot (the wind value still updates
                  for the next shot).{" "}
                  <strong style={{ color: hudColors.value }}>Wind</strong> drifts
                  the ball horizontally; it changes every shot and is shown in the
                  stats panel (arrow: direction the wind comes from, meteorological
                  convention).
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
        <details>
          <summary>Vehicles</summary>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {PREDETERMINED_VEHICLES.map((v) => {
              const isCurrent = v.id === vehicle.id;
              const unlocked = isVehicleUnlocked(stats, v.id);
              const betaTag =
                shouldShowRatataBetaTag() && v.id === PREMIUM_RATATA_VEHICLE_ID;
              const mainCss = rgbTupleToCss(v.mainRgb);
              const accentCss = rgbTupleToCss(v.accentRgb);
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    if (!unlocked) return;
                    reloadWithVehicle(v.id);
                  }}
                  title={
                    unlocked
                      ? `Load ${v.name} and start a new round`
                      : "Win 1 battle to unlock"
                  }
                  style={{
                    ...goldChipButtonStyle(),
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "6px 12px",
                    backgroundImage: `linear-gradient(135deg, ${mainCss} 0%, ${accentCss} 100%)`,
                    border: "1px solid rgba(255,255,255,0.88)",
                    color: "#ffffff",
                    textShadow: "0 1px 2px rgba(0,0,0,0.55)",
                    opacity: unlocked ? 1 : 0.55,
                    cursor: unlocked ? "pointer" : "not-allowed",
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
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      flexWrap: "wrap",
                    }}
                  >
                    {v.name}
                    {betaTag ? (
                      <span
                        style={{
                          fontSize: 7,
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          padding: "1px 5px",
                          borderRadius: 4,
                          background:
                            "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                          border: "1px solid rgba(255,255,255,0.55)",
                        }}
                      >
                        Beta
                      </span>
                    ) : null}
                  </span>
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
        <details>
          <summary>Game Config</summary>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  color: hudColors.label,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Aim control
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  aria-pressed={aimControlMode === "pad"}
                  aria-label="Use aim pad"
                  onClick={() => onAimControlModeChange("pad")}
                  style={{
                    ...goldChipButtonStyle(),
                    minWidth: 72,
                    fontWeight: 700,
                    ...(aimControlMode === "pad"
                      ? {
                          backgroundImage:
                            "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
                          color: "#ffffff",
                        }
                      : {
                          opacity: 0.85,
                        }),
                  }}
                >
                  Pad
                </button>
                <button
                  type="button"
                  aria-pressed={aimControlMode === "buttons"}
                  aria-label="Use aim buttons"
                  onClick={() => onAimControlModeChange("buttons")}
                  style={{
                    ...goldChipButtonStyle(),
                    minWidth: 72,
                    fontWeight: 700,
                    ...(aimControlMode === "buttons"
                      ? {
                          backgroundImage:
                            "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
                          color: "#ffffff",
                        }
                      : {
                          opacity: 0.85,
                        }),
                  }}
                >
                  Buttons
                </button>
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                lineHeight: 1.45,
                color: hudColors.muted,
              }}
            >
              Pad: drag the red dot — up/down for pitch; left/right adjust yaw within
              ±45° for the current side. Use the ⇐ / ⇒ buttons on the pad edge to turn
              90° to the next side. A/D or ← → rotate yaw freely (5° steps). Both axes
              snap to 5°. Buttons mode: the classic arrow rows.
              Saved in this browser.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <span
                style={{
                  color: hudColors.label,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Retro TV effect
              </span>
              <button
                type="button"
                aria-pressed={retroTvEnabled}
                aria-label={
                  retroTvEnabled
                    ? "Disable retro TV effect"
                    : "Enable retro TV effect"
                }
                onClick={() => onRetroTvChange(!retroTvEnabled)}
                style={{
                  ...goldChipButtonStyle(),
                  minWidth: 72,
                  fontWeight: 700,
                  ...(retroTvEnabled
                    ? {
                        backgroundImage:
                          "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
                        color: "#ffffff",
                      }
                    : {
                        opacity: 0.85,
                      }),
                }}
              >
                {retroTvEnabled ? "On" : "Off"}
              </button>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                lineHeight: 1.45,
                color: hudColors.muted,
              }}
            >
              Curved screen, darker corners, and scanlines. Preference is saved
              in this browser.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <span
                style={{
                  color: hudColors.label,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Guideline (trajectory preview)
              </span>
              <button
                type="button"
                aria-pressed={guidelineEnabled}
                aria-label={
                  guidelineEnabled
                    ? "Disable trajectory guideline"
                    : "Enable trajectory guideline"
                }
                onClick={() => onGuidelineEnabledChange(!guidelineEnabled)}
                style={{
                  ...goldChipButtonStyle(),
                  minWidth: 72,
                  fontWeight: 700,
                  ...(guidelineEnabled
                    ? {
                        backgroundImage:
                          "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
                        color: "#ffffff",
                      }
                    : {
                        opacity: 0.85,
                      }),
                }}
              >
                {guidelineEnabled ? "On" : "Off"}
              </button>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                lineHeight: 1.45,
                color: hudColors.muted,
              }}
            >
              When on, a dashed path shows where the shot would land without wind;
              set strength with Guide Power, then Shoot. Saved in this browser.
            </p>
            <button
              type="button"
              onClick={clearAllSavedData}
              style={{
                ...goldPillButtonStyle({ disabled: false, fullWidth: true }),
                marginTop: 4,
                backgroundImage:
                  "linear-gradient(135deg, #e85d5d 0%, #b91c1c 100%)",
                color: "#ffffff",
                textShadow: "0 1px 2px rgba(0,0,0,0.45)",
              }}
            >
              Clear saved data
            </button>
          </div>
        </details>
        <button
          type="button"
          onClick={onClose}
          style={{
            ...goldPillButtonStyle({ disabled: false, fullWidth: true }),
            marginTop: 12,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.04em",
            padding: "8px 16px",
            boxShadow: [
              "inset 0 2px 0 rgba(255,255,255,0.55)",
              "0 4px 0 rgba(0, 55, 110, 0.22)",
              "0 10px 22px rgba(0, 60, 120, 0.28)",
            ].join(", "),
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
