"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

import { usePlayerStats } from "@/components/PlayerStatsProvider";
import {
  goldPillButtonStyle,
  helpModalCard,
  hudColors,
  hudFont,
  hudMiniPanel,
  modalBackdrop,
} from "@/components/gameHudStyles";
import { PREDETERMINED_VEHICLES } from "@/components/playerVehicleConfig";
import type { SessionBattleCount } from "@/lib/game/playSession";

const BATTLE_OPTIONS: SessionBattleCount[] = [3, 9, 18];

const sessionEndShell: CSSProperties = {
  ...hudFont,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  maxWidth: 380,
  width: "min(94vw, 380px)",
  padding: "20px 18px 18px",
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.92)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.65), 0 22px 56px rgba(0, 55, 100, 0.32), 0 0 0 1px rgba(0, 174, 239, 0.12)",
  textAlign: "left",
  backgroundImage: [
    "radial-gradient(ellipse 130% 90% at 50% -15%, rgba(255,255,255,0.98) 0%, transparent 52%)",
    "linear-gradient(168deg, rgba(255,255,255,0.96) 0%, rgba(215, 244, 255, 0.9) 42%, rgba(170, 228, 255, 0.85) 100%)",
  ].join(", "),
};

const rulesPanel: CSSProperties = {
  margin: "0 0 14px",
  padding: "11px 13px",
  borderRadius: 14,
  fontSize: 12.5,
  lineHeight: 1.55,
  color: hudColors.label,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(230, 248, 255, 0.5) 100%)",
  border: "1px solid rgba(255,255,255,0.75)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
};

const statLabel: CSSProperties = {
  color: hudColors.muted,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const secondaryPill: CSSProperties = {
  ...goldPillButtonStyle({ disabled: false, fullWidth: true }),
  backgroundImage:
    "linear-gradient(165deg, #ffffff 0%, #e8f4fc 40%, #c8e8f8 100%)",
  color: hudColors.value,
  textShadow: "0 1px 0 rgba(255,255,255,0.85)",
  border: "1px solid rgba(0, 114, 188, 0.22)",
};

export function SessionEndModal({
  open,
  totalStrokes,
  targetBattles,
  sessionWon,
  battlesWon,
  battlesLost,
  onDone,
  onStartNewSession,
}: {
  open: boolean;
  totalStrokes: number;
  targetBattles: number;
  sessionWon: boolean;
  battlesWon: number;
  battlesLost: number;
  /** Clear session and reload (or leave game). */
  onDone: () => void;
  /** Begin a fresh session with the chosen length; parent should close this modal. */
  onStartNewSession: (battleCount: SessionBattleCount) => void;
}) {
  const [page, setPage] = useState<1 | 2>(1);
  const { stats } = usePlayerStats();

  useEffect(() => {
    if (open) setPage(1);
  }, [open]);

  if (!open) return null;

  const spread = battlesWon - battlesLost;
  const spreadStr = `${spread >= 0 ? "+" : ""}${spread}`;
  const avgShots =
    stats.gamesWon > 0
      ? (stats.totalShotsLifetime / stats.gamesWon).toFixed(2)
      : "—";

  const last = stats.lastCompletedGame;
  const lastVehicleName =
    last &&
    PREDETERMINED_VEHICLES.find((v) => v.id === last.vehicleId)?.name;

  const title = sessionWon ? "Session won" : "Session lost";
  const outcomeHint = sessionWon
    ? "You finished with at least as many battle wins as losses."
    : "Battle wins fell short of battle losses this time.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-end-title"
      style={modalBackdrop}
    >
      {page === 1 ? (
        <div style={sessionEndShell}>
          <div
            style={{
              marginBottom: 14,
              paddingBottom: 12,
              borderBottom: "1px solid rgba(0, 114, 188, 0.12)",
            }}
          >
            <p
              style={{
                margin: "0 0 6px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: hudColors.muted,
              }}
            >
              Session complete · step 1 of 2
            </p>
            <h2
              id="session-end-title"
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                color: hudColors.value,
                textShadow: "0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              {title}
            </h2>
            <div
              aria-hidden
              style={{
                marginTop: 10,
                height: 3,
                width: 48,
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, #00aeef 0%, #0072bc 55%, rgba(0,180,255,0.35) 100%)",
                boxShadow: "0 1px 4px rgba(0, 114, 188, 0.35)",
              }}
            />
          </div>

          <div style={rulesPanel}>{outcomeHint}</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                padding: "12px 10px",
                textAlign: "center",
                ...hudMiniPanel,
              }}
            >
              <div style={statLabel}>Battles</div>
              <div
                style={{
                  color: hudColors.value,
                  fontWeight: 800,
                  fontSize: 26,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                }}
              >
                {targetBattles}
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    opacity: 0.75,
                  }}
                >
                  {" "}
                  played
                </span>
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: hudColors.label,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span style={{ color: hudColors.accent }}>{battlesWon}</span>
                {" won · "}
                <span style={{ color: hudColors.muted }}>{battlesLost}</span>
                {" lost"}
              </div>
            </div>
            <div
              style={{
                padding: "12px 10px",
                textAlign: "center",
                ...hudMiniPanel,
              }}
            >
              <div style={statLabel}>Total strokes</div>
              <div
                style={{
                  color: hudColors.value,
                  fontWeight: 800,
                  fontSize: 26,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                }}
              >
                {totalStrokes}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: hudColors.label,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                Spread{" "}
                <strong style={{ color: hudColors.value }}>{spreadStr}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage(2)}
              style={goldPillButtonStyle({ disabled: false, fullWidth: true })}
            >
              Career & stats
            </button>
            <button type="button" onClick={onDone} style={secondaryPill}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <div style={{ ...helpModalCard, ...sessionEndShell, maxHeight: "min(82vh, 520px)" }}>
          <div
            style={{
              marginBottom: 12,
              paddingBottom: 10,
              borderBottom: "1px solid rgba(0, 114, 188, 0.12)",
            }}
          >
            <p
              style={{
                margin: "0 0 6px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: hudColors.muted,
              }}
            >
              Session complete · step 2 of 2
            </p>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: hudColors.value,
              }}
            >
              Your profile snapshot
            </h2>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 12,
                color: hudColors.label,
                lineHeight: 1.45,
              }}
            >
              Same stats as the Profile menu — start a new session below or go
              back to the summary.
            </p>
          </div>

          <section style={{ marginBottom: 14 }}>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: 12,
                fontWeight: 700,
                color: hudColors.value,
              }}
            >
              Career
            </h3>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                color: hudColors.label,
                fontSize: 12,
                lineHeight: 1.6,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <li>Holes completed: {stats.gamesWon}</li>
              <li>Total shots (completed holes): {stats.totalShotsLifetime}</li>
              <li>Average shots per hole: {avgShots}</li>
              <li>
                Strength power-ups used (lifetime):{" "}
                {stats.totalStrengthPowerupsUsed}
              </li>
              <li>
                No-bounce power-ups used (lifetime):{" "}
                {stats.totalNoBouncePowerupsUsed}
              </li>
              <li>Water penalties (lifetime): {stats.totalWaterPenalties}</li>
              <li>Gold coins (lifetime): {stats.totalGoldCoins}</li>
            </ul>
          </section>

          <section style={{ marginBottom: 16 }}>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: 12,
                fontWeight: 700,
                color: hudColors.value,
              }}
            >
              Last completed hole
            </h3>
            {!last ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: hudColors.muted,
                  lineHeight: 1.5,
                }}
              >
                Finish a hole by hitting the goal to record a round here.
              </p>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  color: hudColors.label,
                  lineHeight: 1.55,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <p style={{ margin: "0 0 6px" }}>
                  Vehicle:{" "}
                  <strong style={{ color: hudColors.value }}>
                    {lastVehicleName ?? last.vehicleId}
                  </strong>
                </p>
                <p style={{ margin: "0 0 6px" }}>Shots: {last.shots}</p>
                <p style={{ margin: "0 0 6px" }}>
                  Goal center: X {last.goalWorldX}, Z {last.goalWorldZ}
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  Power-ups this hole — strength: {last.strengthUses}, no bounce:{" "}
                  {last.noBounceUses}
                </p>
                <p style={{ margin: "0 0 8px" }}>
                  Water penalties this hole: {last.waterPenaltiesThisRound}
                </p>
                <p
                  style={{
                    margin: "0 0 4px",
                    fontWeight: 700,
                    color: hudColors.value,
                  }}
                >
                  Water hazards (pond centers and half-extents)
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                  }}
                >
                  {last.ponds.length === 0 ? (
                    <li style={{ color: hudColors.muted }}>None on that layout.</li>
                  ) : (
                    last.ponds.map((p, i) => (
                      <li key={`${p.worldX}-${p.worldZ}-${i}`}>
                        Pond {i + 1}: center ({p.worldX}, {p.worldZ}) — half size{" "}
                        {p.halfX} × {p.halfZ}
                      </li>
                    ))
                  )}
                </ul>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 10,
                    color: hudColors.muted,
                  }}
                >
                  Saved: {new Date(last.completedAt).toLocaleString()}
                </p>
              </div>
            )}
          </section>

          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              fontWeight: 600,
              color: hudColors.label,
            }}
          >
            New session — pick length
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {BATTLE_OPTIONS.map((battleCount) => (
              <button
                key={battleCount}
                type="button"
                onClick={() => onStartNewSession(battleCount)}
                style={{
                  ...goldPillButtonStyle({
                    disabled: false,
                    fullWidth: true,
                  }),
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  padding: "10px 6px",
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {battleCount}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    opacity: 0.92,
                    letterSpacing: "0.04em",
                  }}
                >
                  battles
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage(1)}
              style={secondaryPill}
            >
              Back to summary
            </button>
            <button
              type="button"
              onClick={onDone}
              style={goldPillButtonStyle({ disabled: false, fullWidth: true })}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
