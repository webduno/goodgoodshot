"use client";

import type { CSSProperties } from "react";
import { useEffect } from "react";

import {
  goldPillButtonStyle,
  hudColors,
  hudFont,
  modalBackdrop,
  plazaHubButtonStyle,
} from "@/components/gameHudStyles";
import { burstFinishBattleConfetti } from "@/lib/game/confetti";

const finishModalShell: CSSProperties = {
  ...hudFont,
  position: "relative",
  isolation: "isolate",
  overflow: "visible",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  maxWidth: 348,
  width: "min(92vw, 348px)",
  padding: "24px 20px 44px",
  borderRadius: "38px 30px 42px 34px",
  border: "1px solid rgba(255,255,255,0.95)",
  boxShadow: [
    "inset 0 2px 8px rgba(255,255,255,0.9)",
    "inset 0 -18px 36px rgba(0, 185, 230, 0.07)",
    "0 28px 70px rgba(0, 45, 95, 0.3)",
    "0 0 0 1px rgba(0, 210, 255, 0.22)",
  ].join(", "),
  textAlign: "center",
  backgroundImage: [
    "radial-gradient(ellipse 125% 90% at 50% -18%, rgba(255,255,255,0.99) 0%, transparent 55%)",
    "radial-gradient(ellipse 70% 55% at 92% 8%, rgba(180, 255, 255, 0.45) 0%, transparent 58%)",
    "linear-gradient(162deg, rgba(255,255,255,0.97) 0%, rgba(220, 248, 255, 0.93) 40%, rgba(150, 225, 255, 0.88) 100%)",
  ].join(", "),
};

const finishActionsAnchor: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  transform: "translateY(50%)",
  display: "flex",
  flexDirection: "column",
  gap: 0,
  zIndex: 2,
};

function outcomeSubtitle(
  battleWon: boolean,
  lossReason: "par" | "enemy"
): string {
  if (battleWon) return "You won! 🎉 Congratulations! You reached the goal under the shot limit.";
  if (lossReason === "enemy") return "An Enemy Virus attacked your vehicle.";
  return "You lost! 😭 Sorry, you reached the goal over the shot limit.";
}

export function FinishGameModal({
  open,
  sessionShots,
  par,
  battleWon,
  lossReason = "par",
  onContinue,
  onGoToPlaza,
  onOpenHelp,
}: {
  open: boolean;
  sessionShots: number;
  par: number;
  battleWon: boolean;
  lossReason?: "par" | "enemy";
  onContinue: () => void;
  onGoToPlaza?: () => void;
  onOpenHelp?: () => void;
}) {
  useEffect(() => {
    if (!open || !battleWon) return;
    burstFinishBattleConfetti();
  }, [open, battleWon]);

  if (!open) return null;

  const subtitle = outcomeSubtitle(battleWon, lossReason);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-title"
      style={modalBackdrop}
    >
      <div style={finishModalShell}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            borderRadius: "inherit",
            overflow: "hidden",
            zIndex: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-20%",
              left: "-14%",
              width: "58%",
              height: "44%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 40% 40%, rgba(160, 250, 255, 0.52) 0%, transparent 68%)",
              filter: "blur(36px)",
              opacity: 0.92,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-14%",
              right: "-10%",
              width: "54%",
              height: "42%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 55% 45%, rgba(0, 215, 255, 0.26) 0%, transparent 72%)",
              filter: "blur(32px)",
            }}
          />
        </div>
        {onOpenHelp ? (
          <button
            type="button"
            aria-label="How to play"
            onClick={onOpenHelp}
            style={{
              position: "absolute",
              top: 8,
              right: 12,
              width: 48,
              height: 48,
              borderRadius: "50%",
              zIndex: 3,
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "translate(36%, -40%)",
              background:
                "radial-gradient(circle at 38% 30%, rgba(255,255,255,0.98) 0%, rgba(140, 235, 255, 0.78) 40%, rgba(0, 175, 225, 0.55) 100%)",
              border: "1px solid rgba(255,255,255,0.92)",
              boxShadow:
                "inset 0 2px 0 rgba(255,255,255,0.75), 0 6px 18px rgba(0, 82, 130, 0.32)",
              ...hudFont,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                fontStyle: "italic",
                lineHeight: 1,
                color: hudColors.value,
                textShadow: "0 1px 0 rgba(255,255,255,0.85)",
              }}
            >
              i
            </span>
          </button>
        ) : null}
        <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                paddingBottom: onGoToPlaza ? 132 : 72,
              }}
            >
            <h2
              id="finish-title"
              style={{
                margin: "0 0 10px",
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                color: hudColors.value,
                textShadow:
                  "0 1px 0 rgba(255,255,255,0.95), 0 0 20px rgba(180, 240, 255, 0.35)",
              }}
            >
              {battleWon ? "Battle won" : "Battle lost"}
            </h2>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.35,
                color: hudColors.label,
              }}
            >
              {subtitle}
            </p>
            <div
              style={{
                display: "inline-block",
                margin: "0 auto",
                padding: "10px 16px",
                borderRadius: 16,
                fontSize: 14,
                fontVariantNumeric: "tabular-nums",
                color: hudColors.label,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(220, 244, 255, 0.75) 100%)",
                border: "1px solid rgba(0, 150, 200, 0.22)",
                boxShadow:
                  "inset 0 2px 0 rgba(255,255,255,0.9), 0 4px 12px rgba(0, 82, 130, 0.1)",
              }}
            >
              Shots:{" "}
              <strong style={{ color: hudColors.value }}>{sessionShots}</strong>
              {" · "}
              Shot limit:{" "}
              <strong style={{ color: hudColors.value }}>{par}</strong>
            </div>
            <hr style={{ margin: "14px 0 32px 0", opacity: 0.2 }} />
            <div style={finishActionsAnchor}>
              <button
                type="button"
                onClick={onContinue}
                style={{
                  ...goldPillButtonStyle({ disabled: false, fullWidth: true }),
                  padding: "14px 20px",
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                  boxShadow: [
                    "inset 0 1px 0 rgba(255,255,255,0.65)",
                    "0 4px 0 rgba(0, 60, 100, 0.22)",
                    "0 14px 28px rgba(0, 82, 130, 0.38)",
                  ].join(", "),
                }}
              >
                Continue Next Battle
              </button>
              
            <div
              style={{
                width: "100%",
                overflow: "hidden",
              }}
            >
              <img
                src="/textures/plaza1.png"
                alt=""
                width={520}
                height={320}
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                }}
              />
            </div>
              {onGoToPlaza ? (
                <button
                  type="button"
                  onClick={onGoToPlaza}
                  style={{
                    ...plazaHubButtonStyle({
                      variant: "full",
                      fullWidth: true,
                    }),
                    marginTop: 0,
                    padding: "14px 20px",
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: "0.03em",
                  }}
                >
                  Go to Plaza Town
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
