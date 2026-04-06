"use client";

import type { CSSProperties } from "react";

import {
  goldPillButtonStyle,
  hudColors,
  hudFont,
  hudMiniPanel,
  modalBackdrop,
} from "@/components/gameHudStyles";
import {
  formatSessionScoreHud,
  type PlaySession,
  type SessionBattleCount,
} from "@/lib/game/playSession";

const BATTLE_OPTIONS: SessionBattleCount[] = [3, 9, 18];

const startModalShell: CSSProperties = {
  ...hudFont,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  maxWidth: 352,
  width: "min(92vw, 352px)",
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

export function StartGameModal({
  open,
  sessionReady,
  session,
  onContinue,
  onStartSession,
}: {
  open: boolean;
  sessionReady: boolean;
  session: PlaySession | null;
  onContinue: () => void;
  onStartSession: (battleCount: SessionBattleCount) => void;
}) {
  if (!open) return null;

  if (!sessionReady) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-label="Loading session"
        style={modalBackdrop}
      >
        <div style={startModalShell}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: hudColors.muted,
              textAlign: "center",
            }}
          >
            Loading…
          </p>
        </div>
      </div>
    );
  }

  const roundsDone =
    session !== null ? session.battlesWon + session.battlesLost : 0;
  const inProgress =
    session !== null && roundsDone < session.targetBattles;
  const hasStartedBattles = roundsDone > 0;

  const title =
    inProgress && hasStartedBattles ? "Continue session" : "Welcome";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-game-title"
      style={modalBackdrop}
    >
      <div style={startModalShell}>
        <div
          style={{
            marginBottom: 14,
            paddingBottom: 12,
            borderBottom: "1px solid rgba(0, 114, 188, 0.12)",
          }}
        >
          <h2
            id="start-game-title"
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

        <div style={rulesPanel}>
          Win a battle — hit the goal at or under par (strokes ≤ coins on the
          hole). The session is a win if your battle wins are at least your
          battle losses (ties count).
        </div>

        {inProgress && session ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  padding: "12px 10px",
                  textAlign: "center",
                  ...hudMiniPanel,
                }}
              >
                <div style={statLabel}>Battle progress</div>
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
                  {roundsDone}
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 18,
                      opacity: 0.75,
                    }}
                  >
                    {" "}
                    / {session.targetBattles}
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
                  <span style={{ color: hudColors.accent }}>
                    {session.battlesWon}
                  </span>
                  {" won · "}
                  <span style={{ color: hudColors.muted }}>
                    {session.battlesLost}
                  </span>
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
                <div style={statLabel}>Session score</div>
                <div
                  style={{
                    color: hudColors.value,
                    fontWeight: 800,
                    fontSize: 17,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.25,
                    letterSpacing: "0.02em",
                  }}
                >
                  {formatSessionScoreHud(session, 0)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onContinue}
              style={goldPillButtonStyle({ disabled: false, fullWidth: true })}
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 12,
                fontWeight: 600,
                color: hudColors.label,
                lineHeight: 1.45,
              }}
            >
              New session — pick length
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 8,
                marginBottom: 4,
              }}
            >
              {BATTLE_OPTIONS.map((battleCount) => (
                <button
                  key={battleCount}
                  type="button"
                  onClick={() => onStartSession(battleCount)}
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
          </>
        )}
      </div>
    </div>
  );
}
