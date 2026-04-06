"use client";

import {
  goldPillButtonStyle,
  hudColors,
  modalCard,
  modalBackdrop,
} from "@/components/gameHudStyles";
import type { PlaySession, SessionBattleCount } from "@/lib/game/playSession";

const BATTLE_OPTIONS: SessionBattleCount[] = [3, 9, 18];

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
        <div style={modalCard}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: hudColors.muted,
            }}
          >
            Loading…
          </p>
        </div>
      </div>
    );
  }

  const inProgress =
    session !== null && session.battlesWon < session.targetBattles;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-game-title"
      style={modalBackdrop}
    >
      <div style={modalCard}>
        <h2
          id="start-game-title"
          style={{
            margin: "0 0 10px",
            fontSize: 17,
            fontWeight: 700,
            color: hudColors.value,
          }}
        >
          {inProgress ? "Continue session" : "Welcome"}
        </h2>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 13,
            color: hudColors.muted,
            lineHeight: 1.5,
          }}
        >
          Win each battle — hit the red goal.
        </p>
        {inProgress && session ? (
          <>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 13,
                color: hudColors.label,
                lineHeight: 1.5,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Progress:{" "}
              <strong style={{ color: hudColors.value }}>
                {session.battlesWon} / {session.targetBattles}
              </strong>{" "}
              battles won
            </p>
            <p
              style={{
                margin: "0 0 16px",
                fontSize: 13,
                color: hudColors.label,
                lineHeight: 1.5,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Session strokes so far:{" "}
              <strong style={{ color: hudColors.value }}>
                {session.totalStrokes}
              </strong>
            </p>
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
                color: hudColors.label,
                lineHeight: 1.45,
              }}
            >
              New session — how many battles?
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {BATTLE_OPTIONS.map((battleCount) => (
                <button
                  key={battleCount}
                  type="button"
                  onClick={() => onStartSession(battleCount)}
                  style={goldPillButtonStyle({
                    disabled: false,
                    fullWidth: true,
                  })}
                >
                  {battleCount} battles
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
