"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  goldChipButtonStyle,
  helpModalCard,
  hudColors,
  hudFont,
  modalBackdrop,
  plazaPvpDockButtonStyle,
} from "@/components/gameHudStyles";
import type { SessionBiomeChoice } from "@/lib/game/sessionBattleMaps";

const BIOME_OPTIONS: readonly {
  id: SessionBiomeChoice;
  label: string;
}[] = [
  { id: "random", label: "Random" },
  { id: "plain", label: "Plain" },
  { id: "desert", label: "Desert" },
  { id: "forest", label: "Forest" },
  { id: "snow", label: "Snow" },
  { id: "sea", label: "Sea" },
  { id: "ice", label: "Ice" },
];

type Step = "main" | "pickMode" | "pickBiome";

const modalTitleStyle: CSSProperties = {
  margin: "0 0 14px",
  fontSize: 18,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  color: hudColors.value,
  textShadow: "0 1px 0 rgba(255,255,255,0.95)",
};

const modalSectionTitleStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 17,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  color: hudColors.value,
  textShadow: "0 1px 0 rgba(255,255,255,0.92)",
};

export function MultiplayerModal({
  open,
  onClose,
  busy,
  onCreatePvp,
  onCreatePve,
  onJoinPvp,
  onQuickMatch,
}: {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  onCreatePvp: (biomeChoice: SessionBiomeChoice) => void | Promise<void>;
  onCreatePve: (biomeChoice: SessionBiomeChoice) => void | Promise<void>;
  onJoinPvp: () => void;
  onQuickMatch: () => void | Promise<void>;
}) {
  const [step, setStep] = useState<Step>("main");
  const [roomMode, setRoomMode] = useState<"pvp" | "pve" | null>(null);
  const [biomeChoice, setBiomeChoice] = useState<SessionBiomeChoice>("random");

  useEffect(() => {
    if (!open) return;
    setStep("main");
    setRoomMode(null);
    setBiomeChoice("random");
  }, [open]);

  const goBack = useCallback(() => {
    if (step === "pickBiome") {
      setStep("pickMode");
      setRoomMode(null);
      return;
    }
    if (step === "pickMode") {
      setStep("main");
      setRoomMode(null);
      return;
    }
    onClose();
  }, [step, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goBack]);

  if (!open) return null;

  const titleText =
    step === "main"
      ? "Multiplayer"
      : step === "pickMode"
        ? "Create room"
        : roomMode === "pvp"
          ? "New PvP room"
          : "New PvE room";

  const backRow = (
    <div style={{ marginBottom: 10 }}>
      <button
        type="button"
        disabled={busy}
        onClick={goBack}
        style={{
          padding: "4px 0",
          border: "none",
          background: "none",
          cursor: busy ? "not-allowed" : "pointer",
          fontSize: 12,
          fontWeight: 700,
          color: hudColors.accent,
          textDecoration: "underline",
          textUnderlineOffset: 2,
          ...hudFont,
        }}
      >
        ← Back
      </button>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plaza-multiplayer-modal-title"
      style={modalBackdrop}
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        goBack();
      }}
    >
      <div
        style={{
          ...helpModalCard,
          maxWidth: 400,
          width: "min(94vw, 400px)",
          textAlign: "left",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {step === "main" ? (
          <>
            <h2 id="plaza-multiplayer-modal-title" style={modalTitleStyle}>
              {titleText}
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                alignItems: "stretch",
              }}
            >
              <button
                type="button"
                disabled={busy}
                aria-label="Create a new online room"
                onClick={() => setStep("pickMode")}
                style={plazaPvpDockButtonStyle({
                  variant: "create",
                  disabled: busy,
                })}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    fontSize: 13,
                    fontWeight: 900,
                    lineHeight: 1,
                    background:
                      "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.2) 45%, rgba(0,80,100,0.35) 100%)",
                    border: "1px solid rgba(255,255,255,0.75)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
                  }}
                >
                  +
                </span>
                Create room
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label="Join a PvP room by code"
                onClick={onJoinPvp}
                style={plazaPvpDockButtonStyle({
                  variant: "join",
                  disabled: busy,
                })}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 900,
                    lineHeight: 1,
                    background:
                      "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.18) 48%, rgba(0,60,120,0.35) 100%)",
                    border: "1px solid rgba(255,255,255,0.78)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                  }}
                >
                  #
                </span>
                Join PvP
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label="Quick match"
                onClick={() => {
                  void onQuickMatch();
                }}
                style={plazaPvpDockButtonStyle({
                  variant: "quick",
                  disabled: busy,
                })}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    fontSize: 11,
                    fontWeight: 900,
                    lineHeight: 1,
                    background:
                      "radial-gradient(circle at 30% 22%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.25) 42%, rgba(60,100,20,0.4) 100%)",
                    border: "1px solid rgba(255,255,255,0.8)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
                  }}
                >
                  ▶
                </span>
                Quick match
              </button>
            </div>
          </>
        ) : null}

        {step === "pickMode" ? (
          <>
            {backRow}
            <h2 id="plaza-multiplayer-modal-title" style={modalSectionTitleStyle}>
              {titleText}
            </h2>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 12,
                lineHeight: 1.45,
                color: hudColors.label,
                ...hudFont,
              }}
            >
              Head-to-head duel, or co-op race — then you&apos;ll pick the
              fairway.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                alignItems: "stretch",
              }}
            >
              <button
                type="button"
                disabled={busy}
                aria-label="Create a PvP room"
                onClick={() => {
                  setRoomMode("pvp");
                  setStep("pickBiome");
                }}
                style={{
                  ...plazaPvpDockButtonStyle({
                    variant: "create",
                    disabled: busy,
                  }),
                  justifyContent: "flex-start",
                  alignItems: "center",
                  minHeight: 48,
                  padding: "10px 14px",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    fontSize: 13,
                    fontWeight: 900,
                    lineHeight: 1,
                    background:
                      "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.2) 45%, rgba(0,80,100,0.35) 100%)",
                    border: "1px solid rgba(255,255,255,0.75)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
                  }}
                >
                  +
                </span>
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 2,
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800 }}>PvP</span>
                  <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.92 }}>
                    Duel vs another player
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label="Create a PvE room"
                onClick={() => {
                  setRoomMode("pve");
                  setStep("pickBiome");
                }}
                style={{
                  ...plazaPvpDockButtonStyle({
                    variant: "create",
                    disabled: busy,
                  }),
                  justifyContent: "flex-start",
                  alignItems: "center",
                  minHeight: 48,
                  padding: "10px 14px",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    fontSize: 13,
                    fontWeight: 900,
                    lineHeight: 1,
                    background:
                      "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.2) 45%, rgba(0,100,80,0.35) 100%)",
                    border: "1px solid rgba(255,255,255,0.75)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
                  }}
                >
                  +
                </span>
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 2,
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800 }}>PvE</span>
                  <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.92 }}>
                    Co-op race to the goal
                  </span>
                </span>
              </button>
            </div>
          </>
        ) : null}

        {step === "pickBiome" && roomMode !== null ? (
          <>
            {backRow}
            <h2 id="plaza-multiplayer-modal-title" style={modalSectionTitleStyle}>
              {titleText}
            </h2>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 12,
                lineHeight: 1.45,
                color: hudColors.label,
                ...hudFont,
              }}
            >
              Pick a fairway for this room. Random still gives both players the
              same course — it&apos;s chosen from the match seed.
            </p>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: hudColors.muted,
              }}
            >
              Fairway
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                marginBottom: 14,
                maxHeight: "min(36vh, 200px)",
                overflowY: "auto",
                paddingRight: 2,
              }}
            >
              {BIOME_OPTIONS.map((opt) => {
                const selected = biomeChoice === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={busy}
                    onClick={() => setBiomeChoice(opt.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 10,
                      border: selected
                        ? "2px solid #0072bc"
                        : "1px solid rgba(0, 114, 188, 0.18)",
                      background: selected
                        ? "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(210, 240, 255, 0.55) 100%)"
                        : "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(230, 248, 255, 0.35) 100%)",
                      cursor: busy ? "not-allowed" : "pointer",
                      textAlign: "left",
                      ...hudFont,
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12,
                        fontWeight: 700,
                        color: hudColors.value,
                      }}
                    >
                      {opt.label}
                    </span>
                    {selected ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: hudColors.accent,
                        }}
                        aria-hidden
                      >
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (roomMode === "pvp") void onCreatePvp(biomeChoice);
                else void onCreatePve(biomeChoice);
              }}
              style={{
                ...plazaPvpDockButtonStyle({
                  variant: "create",
                  disabled: busy,
                }),
                width: "100%",
                boxSizing: "border-box",
                justifyContent: "center",
              }}
            >
              Create room
            </button>
          </>
        ) : null}

        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={goldChipButtonStyle()}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
