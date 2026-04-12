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
import { playSfx, SFX } from "@/lib/sfx/sfxPlayer";

/** Main-step Create / Join dock pills: lift + tilt + glow (inline box-shadow needs !important on hover). */
const multiplayerDockMainHoverCss = `
  .ggsMultiplayerDockCreate,
  .ggsMultiplayerDockJoin {
    transition: transform 0.22s cubic-bezier(0.34, 1.45, 0.64, 1),
      box-shadow 0.22s ease,
      filter 0.22s ease;
    will-change: transform;
  }
  .ggsMultiplayerDockCreate:disabled,
  .ggsMultiplayerDockJoin:disabled {
    transition: none;
  }
  .ggsMultiplayerDockCreate:not(:disabled):hover {
    transform: translate(-3px, -6px) rotate(-2.2deg) scale(1.04);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.72),
      0 12px 26px rgba(0, 82, 130, 0.42),
      0 0 0 1px rgba(255, 255, 255, 0.55) !important;
    filter: brightness(1.08) saturate(1.06);
  }
  .ggsMultiplayerDockJoin:not(:disabled):hover {
    transform: translate(3px, -6px) rotate(2.2deg) scale(1.04);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.72),
      0 14px 30px rgba(160, 55, 15, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.55) !important;
    filter: brightness(1.08) saturate(1.08);
  }
  .ggsMultiplayerDockCreate:not(:disabled):active {
    transition-duration: 0.08s;
    transform: translate(-1px, -2px) rotate(-0.5deg) scale(1.02);
    filter: brightness(0.98);
  }
  .ggsMultiplayerDockJoin:not(:disabled):active {
    transition-duration: 0.08s;
    transform: translate(1px, -2px) rotate(0.5deg) scale(1.02);
    filter: brightness(0.98);
  }
  @media (prefers-reduced-motion: reduce) {
    .ggsMultiplayerDockCreate,
    .ggsMultiplayerDockJoin {
      transition: filter 0.15s ease, box-shadow 0.15s ease;
    }
    .ggsMultiplayerDockCreate:not(:disabled):hover,
    .ggsMultiplayerDockJoin:not(:disabled):hover {
      transform: none;
    }
    .ggsMultiplayerDockCreate:not(:disabled):hover,
    .ggsMultiplayerDockJoin:not(:disabled):hover {
      filter: brightness(1.05);
    }
  }
`;

/** Create room → PvP / PvE: subtle gradient + shadow lift on hover (instant, no transition). */
const multiplayerPickModeHoverCss = `
  .ggsMultiplayerPickPvp,
  .ggsMultiplayerPickPve {
    transition: none;
  }
  .ggsMultiplayerPickPvp:not(:disabled):hover {
    background-image: linear-gradient(
      165deg,
      #ffffff 0%,
      #fff1f2 10%,
      #fda4af 34%,
      #f43f5e 64%,
      #be123c 100%
    ) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.68),
      0 6px 18px rgba(130, 28, 58, 0.38) !important;
    filter: brightness(1.04);
  }
  .ggsMultiplayerPickPve:not(:disabled):hover {
    background-image: linear-gradient(
      165deg,
      #ffffff 0%,
      #f0fdf4 8%,
      #86efac 34%,
      #10b981 64%,
      #047857 100%
    ) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.68),
      0 6px 18px rgba(22, 105, 72, 0.36) !important;
    filter: brightness(1.04);
  }
`;

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

/** Larger labels than the compact plaza dock default (11px) for this modal. */
const multiplayerDockButtonLabelStyle: CSSProperties = {
  fontSize: 15,
  minHeight: 44,
  padding: "10px 16px",
};

/** Create / Join on main step: large icon above label (overrides row flex from dock style). */
const multiplayerDockMainButtonStackStyle: CSSProperties = {
  flexDirection: "column",
  gap: 5,
  justifyContent: "center",
  alignItems: "center",
  minHeight: 56,
  padding: "10px 12px",
};

const multiplayerDockMainIconBox = 40;

/** Orange gloss for Join Room — same Frutiger Aero structure as other dock pills. */
const multiplayerJoinRoomOrangeStyle: CSSProperties = {
  backgroundImage:
    "linear-gradient(165deg, #ffffff 0%, #ffedd5 11%, #fdba74 34%, #f97316 62%, #9a3412 100%)",
  boxShadow: [
    "inset 0 1px 0 rgba(255,255,255,0.62)",
    "0 4px 14px rgba(160, 55, 15, 0.34)",
  ].join(", "),
};

export function MultiplayerModal({
  open,
  onClose,
  busy,
  onCreatePvp,
  onCreatePve,
  onJoinPvp,
  onQuickMatch,
  onOpenHelp,
}: {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  onCreatePvp: (biomeChoice: SessionBiomeChoice) => void | Promise<void>;
  onCreatePve: (biomeChoice: SessionBiomeChoice) => void | Promise<void>;
  onJoinPvp: () => void;
  onQuickMatch: () => void | Promise<void>;
  /** When set, shows a "Help" link on the right of the modal title row. */
  onOpenHelp?: () => void;
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

  const titleRow = (
    titleStyle: CSSProperties,
    marginBottomPx: number,
    title: string
  ) => {
    if (!onOpenHelp) {
      return (
        <h2
          id="plaza-multiplayer-modal-title"
          style={{ ...titleStyle, margin: `0 0 ${marginBottomPx}px` }}
        >
          {title}
        </h2>
      );
    }
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: marginBottomPx,
          width: "100%",
        }}
      >
        <h2
          id="plaza-multiplayer-modal-title"
          style={{
            ...titleStyle,
            margin: 0,
            flex: 1,
            minWidth: 0,
            textAlign: "left",
          }}
        >
          {title}
        </h2>
        <button
          type="button"
          disabled={busy}
          onClick={onOpenHelp}
          aria-label="Open help"
          onMouseEnter={() => {
            if (!busy) playSfx(SFX.passbip);
          }}
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
            flexShrink: 0,
            ...hudFont,
          }}
        >
          Help
        </button>
      </div>
    );
  };

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
      <style
        dangerouslySetInnerHTML={{
          __html: multiplayerDockMainHoverCss + multiplayerPickModeHoverCss,
        }}
      />
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
            {titleRow(modalTitleStyle, 14, titleText)}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 6,
                  alignItems: "stretch",
                }}
              >
                <button
                  type="button"
                  className="ggsMultiplayerDockCreate"
                  disabled={busy}
                  aria-label="Create a new online room"
                  onClick={() => setStep("pickMode")}
                  onMouseEnter={() => {
                    if (!busy) playSfx(SFX.passbip);
                  }}
                  style={{
                    ...plazaPvpDockButtonStyle({
                      variant: "create",
                      disabled: busy,
                    }),
                    ...multiplayerDockButtonLabelStyle,
                    ...multiplayerDockMainButtonStackStyle,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: multiplayerDockMainIconBox,
                      height: multiplayerDockMainIconBox,
                      borderRadius: "50%",
                      fontSize: 24,
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
                  className="ggsMultiplayerDockJoin"
                  disabled={busy}
                  aria-label="Join a PvP room by code"
                  onClick={onJoinPvp}
                  onMouseEnter={() => {
                    if (!busy) playSfx(SFX.passbip);
                  }}
                  style={{
                    ...plazaPvpDockButtonStyle({
                      variant: "join",
                      disabled: busy,
                    }),
                    ...multiplayerDockButtonLabelStyle,
                    ...multiplayerDockMainButtonStackStyle,
                    ...(busy ? {} : multiplayerJoinRoomOrangeStyle),
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: multiplayerDockMainIconBox,
                      height: multiplayerDockMainIconBox,
                      borderRadius: 8,
                      fontSize: 20,
                      fontWeight: 900,
                      lineHeight: 1,
                      background: busy
                        ? "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.18) 48%, rgba(0,60,120,0.35) 100%)"
                        : "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.2) 45%, rgba(160,65,15,0.38) 100%)",
                      border: "1px solid rgba(255,255,255,0.78)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                    }}
                  >
                    #
                  </span>
                  Join Room
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                aria-label="Quick match"
                onClick={() => {
                  void onQuickMatch();
                }}
                onMouseEnter={() => {
                  if (!busy) playSfx(SFX.passbip);
                }}
                style={{
                  ...plazaPvpDockButtonStyle({
                    variant: "quick",
                    disabled: busy,
                  }),
                  ...multiplayerDockButtonLabelStyle,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    fontSize: 12,
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
            {titleRow(modalSectionTitleStyle, 8, titleText)}
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
                className="ggsMultiplayerPickPvp"
                disabled={busy}
                aria-label="Create a PvP room"
                onClick={() => {
                  setRoomMode("pvp");
                  setStep("pickBiome");
                }}
                onMouseEnter={() => {
                  if (!busy) playSfx(SFX.passbip);
                }}
                style={{
                  ...plazaPvpDockButtonStyle({
                    variant: "create",
                    disabled: busy,
                  }),
                  ...(busy
                    ? {}
                    : {
                        backgroundImage:
                          "linear-gradient(165deg, #ffffff 0%, #ffe4e6 12%, #fb7185 38%, #e11d48 68%, #9f1239 100%)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.62), 0 4px 14px rgba(120, 25, 55, 0.32)",
                      }),
                  fontSize: 15,
                  justifyContent: "space-between",
                  alignItems: "center",
                  minHeight: 48,
                  padding: "10px 14px",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      borderRadius: "50%",
                      fontSize: 20,
                      lineHeight: 1,
                      background:
                        "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.2) 45%, rgba(180, 30, 60, 0.35) 100%)",
                      border: "1px solid rgba(255,255,255,0.75)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
                    }}
                  >
                    ⚔️
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>PvP</span>
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    opacity: 0.92,
                    textAlign: "right",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  Duel vs another player
                </span>
              </button>
              <button
                type="button"
                className="ggsMultiplayerPickPve"
                disabled={busy}
                aria-label="Create a PvE room"
                onClick={() => {
                  setRoomMode("pve");
                  setStep("pickBiome");
                }}
                onMouseEnter={() => {
                  if (!busy) playSfx(SFX.passbip);
                }}
                style={{
                  ...plazaPvpDockButtonStyle({
                    variant: "create",
                    disabled: busy,
                  }),
                  ...(busy
                    ? {}
                    : {
                        backgroundImage:
                          "linear-gradient(165deg, #ffffff 0%, #ecfdf5 10%, #6ee7b7 36%, #059669 66%, #064e3b 100%)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.62), 0 4px 14px rgba(20, 95, 60, 0.32)",
                      }),
                  fontSize: 15,
                  justifyContent: "space-between",
                  alignItems: "center",
                  minHeight: 48,
                  padding: "10px 14px",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      borderRadius: "50%",
                      fontSize: 20,
                      lineHeight: 1,
                      background:
                        "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.2) 45%, rgba(0,120,80,0.4) 100%)",
                      border: "1px solid rgba(255,255,255,0.75)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
                    }}
                  >
                    🤝
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>PvE</span>
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    opacity: 0.92,
                    textAlign: "right",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  Co-op race to the goal
                </span>
              </button>
            </div>
          </>
        ) : null}

        {step === "pickBiome" && roomMode !== null ? (
          <>
            {backRow}
            {titleRow(modalSectionTitleStyle, 8, titleText)}
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
                ...multiplayerDockButtonLabelStyle,
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
