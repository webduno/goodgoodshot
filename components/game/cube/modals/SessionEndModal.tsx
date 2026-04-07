"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Fredoka } from "next/font/google";

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

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["600", "700"],
});

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

/** Step 1: brighter frame, subtle stripe, chunky depth — casual game feel. */
const sessionEndShellGame: CSSProperties = {
  ...sessionEndShell,
  padding: "22px 18px 20px",
  borderRadius: 26,
  border: "3px solid rgba(255,255,255,0.98)",
  boxShadow: [
    "inset 0 3px 0 rgba(255,255,255,0.95)",
    "inset 0 -4px 12px rgba(0, 100, 160, 0.08)",
    "0 0 0 2px rgba(0, 200, 255, 0.45)",
    "0 10px 0 rgba(0, 80, 130, 0.12)",
    "0 28px 56px rgba(0, 35, 85, 0.42)",
  ].join(", "),
  backgroundImage: [
    "repeating-linear-gradient(125deg, rgba(255,255,255,0) 0 11px, rgba(0, 190, 255, 0.045) 11px 12px)",
    "radial-gradient(ellipse 120% 80% at 50% -20%, rgba(255,255,255,0.99) 0%, transparent 55%)",
    "linear-gradient(168deg, rgba(255,255,255,0.97) 0%, rgba(200, 248, 255, 0.92) 45%, rgba(140, 230, 255, 0.88) 100%)",
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

const rulesPanelGame: CSSProperties = {
  ...rulesPanel,
  borderRadius: 18,
  border: "2px solid rgba(0, 160, 230, 0.35)",
  fontWeight: 600,
  boxShadow:
    "inset 0 2px 10px rgba(255,255,255,0.65), 0 3px 0 rgba(0, 100, 150, 0.12)",
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

function orangeCtaButtonStyle(pressed: boolean): CSSProperties {
  return {
    position: "relative",
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    border: "none",
    cursor: "pointer",
    padding: "15px 18px",
    borderRadius: 18,
    overflow: "hidden",
    fontFamily: "inherit",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "0.04em",
    lineHeight: 1.25,
    color: "#fffefa",
    WebkitTapHighlightColor: "transparent",
    transform: pressed ? "translateY(4px) scale(0.992)" : "translateY(0) scale(1)",
    transition: "transform 0.07s ease-out, box-shadow 0.07s ease-out",
    backgroundImage: [
      "radial-gradient(ellipse 95% 70% at 50% -15%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.12) 42%, transparent 58%)",
      "radial-gradient(ellipse 80% 50% at 100% 50%, rgba(255, 220, 100, 0.35) 0%, transparent 55%)",
      "linear-gradient(168deg, #fffbeb 0%, #fde68a 10%, #fb923c 38%, #ea580c 62%, #c2410c 88%, #431407 100%)",
    ].join(", "),
    boxShadow: pressed
      ? [
          "inset 0 3px 10px rgba(0,0,0,0.35)",
          "inset 0 1px 0 rgba(255,255,255,0.45)",
          "0 1px 0 rgba(80, 30, 0, 0.55)",
          "0 4px 10px rgba(180, 60, 0, 0.35)",
        ].join(", ")
      : [
          "inset 0 2px 0 rgba(255,255,255,0.75)",
          "inset 0 -4px 12px rgba(100, 30, 0, 0.35)",
          "0 0 0 2px rgba(255, 200, 120, 0.55)",
          "0 0 0 3px rgba(180, 60, 10, 0.45)",
          "0 7px 0 rgba(100, 35, 5, 0.85)",
          "0 12px 28px rgba(220, 90, 0, 0.55)",
          "0 0 40px rgba(251, 146, 60, 0.45)",
        ].join(", "),
    textShadow: [
      "0 1px 0 rgba(0,0,0,0.45)",
      "0 2px 4px rgba(120, 40, 0, 0.55)",
      "0 0 18px rgba(255, 220, 160, 0.35)",
    ].join(", "),
  };
}

const orangeCtaShimmer: CSSProperties = {
  position: "absolute",
  top: "-20%",
  left: "-30%",
  width: "55%",
  height: "140%",
  pointerEvents: "none",
  background:
    "linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0.1) 65%, transparent 100%)",
  transform: "skewX(-14deg)",
  animation: "session-orange-shimmer 2.4s linear infinite",
};

const statPanelGame: CSSProperties = {
  padding: "12px 10px",
  textAlign: "center" as const,
  ...hudMiniPanel,
  borderRadius: 18,
  border: "2px solid rgba(0, 190, 255, 0.4)",
  boxShadow: [
    "inset 0 2px 8px rgba(255,255,255,0.75)",
    "0 4px 0 rgba(0, 100, 150, 0.1)",
    "0 8px 16px rgba(0, 80, 130, 0.15)",
  ].join(", "),
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
  /** Clear war progress and reload (or leave game). */
  onDone: () => void;
  /** Begin a fresh war with the chosen length; parent should close this modal. */
  onStartNewSession: (battleCount: SessionBattleCount) => void;
}) {
  const [page, setPage] = useState<1 | 2>(1);
  const [orangeCtaPressed, setOrangeCtaPressed] = useState(false);
  const { stats } = usePlayerStats();

  useEffect(() => {
    if (open) setPage(1);
  }, [open]);

  useEffect(() => {
    if (!open) setOrangeCtaPressed(false);
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

  const title = sessionWon ? "War won" : "War lost";
  const outcomeHint = sessionWon
    ? "You finished with at least as many battle wins as losses."
    : "Battle wins fell short of battle losses this time.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="war-end-title"
      style={modalBackdrop}
    >
      <style>{`
        @keyframes session-end-card-in {
          from {
            opacity: 0;
            transform: scale(0.94) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes session-orange-shimmer {
          0% {
            transform: translateX(-60%) skewX(-14deg);
          }
          100% {
            transform: translateX(280%) skewX(-14deg);
          }
        }
      `}</style>
      {page === 1 ? (
        <div
          className={fredoka.className}
          style={{
            ...sessionEndShellGame,
            animation: "session-end-card-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <div
            style={{
              marginBottom: 14,
              paddingBottom: 12,
              borderBottom: "2px solid rgba(0, 160, 220, 0.18)",
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#0072bc",
                textShadow: "0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              ★ War complete
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span
                aria-hidden
                style={{
                  fontSize: 40,
                  lineHeight: 1,
                  filter: "drop-shadow(0 3px 2px rgba(0,60,100,0.25))",
                }}
              >
                {sessionWon ? "🏆" : "⚔️"}
              </span>
              <h2
                id="war-end-title"
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  color: hudColors.value,
                  textShadow: [
                    "0 2px 0 rgba(255,255,255,0.95)",
                    "0 3px 0 rgba(0, 80, 120, 0.15)",
                    "0 8px 18px rgba(0, 120, 180, 0.2)",
                  ].join(", "),
                }}
              >
                {title}{" "}
                <span
                  style={{
                    fontSize: "0.78em",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.02em",
                    color: hudColors.label,
                  }}
                >
                  ({battlesWon}/{targetBattles})
                </span>
              </h2>
            </div>
            <div
              aria-hidden
              style={{
                marginTop: 12,
                height: 5,
                width: 72,
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, #22d3ee 0%, #00aeef 35%, #0072bc 70%, rgba(0,180,255,0.4) 100%)",
                boxShadow:
                  "0 2px 6px rgba(0, 114, 188, 0.45), inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
            />
          </div>

          <div style={rulesPanelGame}>{outcomeHint}</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div style={statPanelGame}>
              <div style={statLabel}>⚔️ Battles</div>
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
            <div style={statPanelGame}>
              <div style={statLabel}>🎯 Total strokes</div>
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

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={() => setPage(2)}
              style={{
                ...goldPillButtonStyle({ disabled: false, fullWidth: true }),
                borderRadius: 16,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.02em",
                border: "2px solid rgba(255,255,255,0.95)",
                boxShadow: [
                  "inset 0 2px 6px rgba(255,255,255,0.45)",
                  "0 4px 0 rgba(0, 70, 120, 0.35)",
                  "0 10px 20px rgba(0, 90, 140, 0.28)",
                ].join(", "),
              }}
            >
              Career & stats
            </button>
            <button
              type="button"
              onClick={() => onStartNewSession(3)}
              style={orangeCtaButtonStyle(orangeCtaPressed)}
              onMouseDown={() => setOrangeCtaPressed(true)}
              onMouseUp={() => setOrangeCtaPressed(false)}
              onMouseLeave={() => setOrangeCtaPressed(false)}
              onTouchStart={() => setOrangeCtaPressed(true)}
              onTouchEnd={() => setOrangeCtaPressed(false)}
            >
              <span style={orangeCtaShimmer} aria-hidden />
              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    fontSize: 20,
                    lineHeight: 1,
                    filter: "drop-shadow(0 3px 2px rgba(0,0,0,0.45))",
                  }}
                >
                  ⚡
                </span>
                <span>Start a new 3-battle war</span>
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className={fredoka.className}
          style={{ ...helpModalCard, ...sessionEndShell, maxHeight: "min(82vh, 520px)" }}
        >
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
              War complete · step 2 of 2
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
              Same stats as the Profile menu — start a new war below or go
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
            New war — pick length
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
