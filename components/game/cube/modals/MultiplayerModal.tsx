"use client";

import { useEffect, useState } from "react";
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

type CreateFlow = null | "pvp" | "pve";

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
  const [createFlow, setCreateFlow] = useState<CreateFlow>(null);
  const [biomeChoice, setBiomeChoice] = useState<SessionBiomeChoice>("random");

  useEffect(() => {
    if (!open) return;
    setCreateFlow(null);
    setBiomeChoice("random");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (createFlow !== null) {
        e.preventDefault();
        setCreateFlow(null);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, createFlow]);

  const goBackOrClose = () => {
    if (createFlow !== null) {
      setCreateFlow(null);
      return;
    }
    onClose();
  };

  if (!open) return null;

  const titleId =
    createFlow === null
      ? "plaza-multiplayer-modal-title"
      : "plaza-multiplayer-create-title";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={modalBackdrop}
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        goBackOrClose();
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
        {createFlow === null ? (
          <>
            <h2
              id="plaza-multiplayer-modal-title"
              style={{
                margin: "0 0 14px",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#fff",
                textShadow: "0 1px 2px rgba(40, 0, 80, 0.55)",
              }}
            >
              Multiplayer
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
                aria-label="Start creating a PvP room"
                onClick={() => setCreateFlow("pvp")}
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
                New PvP
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label="Start creating a PvE room"
                onClick={() => setCreateFlow("pve")}
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
                      "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.2) 45%, rgba(0,100,80,0.35) 100%)",
                    border: "1px solid rgba(255,255,255,0.75)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
                  }}
                >
                  +
                </span>
                New PvE
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label="PvP: join PvP"
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
                aria-label="PvP: quick match"
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
        ) : (
          <>
            <div style={{ marginBottom: 10 }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => setCreateFlow(null)}
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
            <h2
              id="plaza-multiplayer-create-title"
              style={{
                margin: "0 0 6px",
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#fff",
                textShadow: "0 1px 2px rgba(40, 0, 80, 0.55)",
              }}
            >
              {createFlow === "pvp" ? "New PvP room" : "New PvE room"}
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
              Pick a fairway for this room. Random is still fair — both players
              get the same course from the match seed.
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
                if (createFlow === "pvp") void onCreatePvp(biomeChoice);
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
        )}
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
