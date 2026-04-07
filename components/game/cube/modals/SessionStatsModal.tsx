"use client";

import type { CSSProperties } from "react";

import {
  goldPillButtonStyle,
  helpModalCard,
  hudColors,
  modalBackdrop,
} from "@/components/gameHudStyles";
import {
  formatSessionScoreHud,
  type PlaySession,
} from "@/lib/game/playSession";

const statBlock: CSSProperties = {
  marginBottom: 12,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0, 114, 188, 0.2)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(240, 248, 255, 0.85) 100%)",
};

const statLabel: CSSProperties = {
  color: hudColors.muted,
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: 4,
};

const statValue: CSSProperties = {
  color: hudColors.value,
  fontWeight: 700,
  fontSize: 14,
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.35,
};

const rowGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px 12px",
  fontSize: 12,
  lineHeight: 1.45,
  color: hudColors.label,
};

export function SessionStatsModal({
  open,
  onClose,
  session,
  sessionShots,
}: {
  open: boolean;
  onClose: () => void;
  session: PlaySession | null;
  sessionShots: number;
}) {
  if (!open) return null;

  const hudLine = formatSessionScoreHud(session, sessionShots);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="war-stats-title"
      style={modalBackdrop}
      onClick={onClose}
    >
      <div style={helpModalCard} onClick={(e) => e.stopPropagation()}>
        <h2
          id="war-stats-title"
          style={{
            margin: "0 0 12px",
            fontSize: 16,
            fontWeight: 700,
            color: hudColors.value,
          }}
        >
          War
        </h2>

        {!session ? (
          <p
            style={{
              margin: "0 0 14px",
              fontSize: 13,
              lineHeight: 1.5,
              color: hudColors.label,
            }}
          >
            No active war. Start or continue a war from the start
            screen.
          </p>
        ) : (
          <>
            <div style={statBlock}>
              <div style={statLabel}>Score (HUD)</div>
              <div style={{ ...statValue, fontSize: 17 }}>{hudLine}</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: hudColors.label,
                  lineHeight: 1.45,
                }}
              >
                Total strokes / target battles (win spread: wins minus losses).
              </div>
            </div>

            <div style={{ ...statBlock, marginBottom: 14 }}>
              <div style={rowGrid}>
                <div>
                  <div style={statLabel}>Target battles</div>
                  <div style={{ ...statValue, fontSize: 13 }}>
                    {session.targetBattles}
                  </div>
                </div>
                <div>
                  <div style={statLabel}>Completed</div>
                  <div style={{ ...statValue, fontSize: 13 }}>
                    {session.battlesWon + session.battlesLost} /{" "}
                    {session.targetBattles}
                  </div>
                </div>
                <div>
                  <div style={statLabel}>Won</div>
                  <div
                    style={{
                      ...statValue,
                      fontSize: 13,
                      color: hudColors.accent,
                    }}
                  >
                    {session.battlesWon}
                  </div>
                </div>
                <div>
                  <div style={statLabel}>Lost</div>
                  <div style={{ ...statValue, fontSize: 13 }}>
                    {session.battlesLost}
                  </div>
                </div>
                <div>
                  <div style={statLabel}>Strokes (finished battles)</div>
                  <div style={{ ...statValue, fontSize: 13 }}>
                    {session.totalStrokes}
                  </div>
                </div>
                <div>
                  <div style={statLabel}>Strokes (this hole)</div>
                  <div style={{ ...statValue, fontSize: 13 }}>
                    {sessionShots}
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={statLabel}>War started</div>
                  <div style={{ ...statValue, fontSize: 12, fontWeight: 600 }}>
                    {new Date(session.startedAtMs).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          style={goldPillButtonStyle({ disabled: false, fullWidth: true })}
        >
          Close
        </button>
      </div>
    </div>
  );
}
