import type { CSSProperties } from "react";

/** Shared HUD: Frutiger Aero — glassy cyan panels, glossy blue buttons, soft depth. */

export const hudFont: CSSProperties = {
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
};

const glassFace =
  "linear-gradient(165deg, #ffffff 0%, #b8ecff 22%, #00aeef 52%, #0072bc 100%)";

const glassDisabled =
  "linear-gradient(165deg, #e4e8ec 0%, #b0b8c4 100%)";

const edgeLight = "inset 0 1px 0 rgba(255,255,255,0.55)";
const dropSm = "0 3px 10px rgba(0, 82, 130, 0.22)";

const textOnGlass: CSSProperties = {
  color: "#003d5c",
  textShadow: "0 1px 0 rgba(255,255,255,0.45)",
};

/** White labels on glossy blue (Vista / Aero buttons) — reads on busy backgrounds. */
const textOnGlossButton: CSSProperties = {
  color: "#ffffff",
  textShadow:
    "0 1px 2px rgba(0, 35, 70, 0.65), 0 0 1px rgba(0, 35, 70, 0.4)",
};

const textOnGlossButtonDisabled: CSSProperties = {
  color: "#475569",
  textShadow: "0 1px 0 rgba(255,255,255,0.35)",
};

export const hudColors = {
  label: "#0a5f8a",
  value: "#003d5c",
  accent: "#0072bc",
  muted: "#4a7a9a",
} as const;

/** Bottom bar readouts: near-black on the milky panel for WCAG-like contrast. */
export const hudBottomReadoutLabel: CSSProperties = {
  color: "#054a6e",
  textShadow: "0 1px 0 rgba(255,255,255,0.85)",
};

export const hudBottomReadoutValue: CSSProperties = {
  color: "#021018",
  textShadow: "0 1px 0 rgba(255,255,255,0.75)",
};

const panelBlur: CSSProperties = {
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

/** Opaque “milk glass” so ground/sky don’t wash out labels (bottom dock). */
export const hudBottomPanel: CSSProperties = {
  ...hudFont,
  ...panelBlur,
  backgroundImage: [
    "radial-gradient(ellipse 120% 85% at 50% 0%, rgba(255,255,255,0.55) 0%, transparent 62%)",
    "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(235, 250, 255, 0.82) 38%, rgba(200, 238, 255, 0.68) 72%, rgba(175, 228, 248, 0.58) 100%)",
  ].join(", "),
  border: "1px solid rgba(255,255,255,0.88)",
  borderRadius: 18,
  boxShadow: `${edgeLight}, 0 6px 22px rgba(0, 55, 95, 0.16)`,
  padding: "4px 6px 5px",
  maxWidth: 340,
  width: "min(94vw, 340px)",
};

/**
 * Aim row: stacked gradients with different opacities (radial highlight + angled wash + soft base).
 */
export const hudAimPanelStrip: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 6,
  pointerEvents: "auto",
  userSelect: "none",
  padding: "3px 5px",
  borderRadius: 14,
  backgroundColor: "rgba(230, 248, 255, 0.35)",
  backgroundImage: [
    "radial-gradient(ellipse 130% 95% at 50% -5%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.35) 48%, transparent 58%)",
    "linear-gradient(165deg, rgba(255,255,255,0.88) 0%, rgba(210, 244, 255, 0.5) 32%, rgba(120, 210, 245, 0.28) 68%, rgba(0, 130, 195, 0.18) 100%)",
    "linear-gradient(180deg, rgba(0, 174, 239, 0.12) 0%, transparent 42%, rgba(0, 90, 140, 0.1) 100%)",
  ].join(", "),
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
};

export const hudMiniPanel: CSSProperties = {
  ...hudFont,
  ...panelBlur,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(210, 242, 255, 0.88) 100%)",
  border: "1px solid rgba(255,255,255,0.9)",
  borderRadius: 14,
  boxShadow: `${edgeLight}, ${dropSm}, 0 0 0 1px rgba(0, 174, 239, 0.1) inset`,
};

export function goldIconButtonStyle(disabled: boolean): CSSProperties {
  return {
    ...hudFont,
    ...(disabled ? textOnGlossButtonDisabled : textOnGlossButton),
    width: 36,
    height: 34,
    borderRadius: 11,
    border: disabled ? "1px solid #9ca8b4" : "1px solid rgba(255,255,255,0.9)",
    backgroundImage: disabled ? glassDisabled : glassFace,
    fontSize: 16,
    lineHeight: 1,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.72 : 1,
    boxShadow: `${edgeLight}, ${dropSm}`,
  };
}

export function goldPillButtonStyle(opts: {
  disabled: boolean;
  fullWidth?: boolean;
}): CSSProperties {
  const { disabled, fullWidth } = opts;
  return {
    ...hudFont,
    ...(disabled ? textOnGlossButtonDisabled : textOnGlossButton),
    width: fullWidth ? "100%" : "auto",
    minWidth: fullWidth ? undefined : 120,
    padding: "6px 14px",
    borderRadius: 9999,
    border: disabled ? "1px solid #9ca8b4" : "1px solid rgba(255,255,255,0.9)",
    backgroundImage: disabled ? glassDisabled : glassFace,
    fontSize: 11,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.72 : 1,
    boxShadow: `${edgeLight}, ${dropSm}`,
  };
}

/** Small top-bar control (e.g. Help). */
export function goldChipButtonStyle(): CSSProperties {
  return {
    ...hudFont,
    ...textOnGlossButton,
    padding: "5px 12px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.9)",
    backgroundImage: glassFace,
    cursor: "pointer",
    boxShadow: `${edgeLight}, ${dropSm}`,
  };
}

/** Distinct glass tints for Strength vs No bounce (HUD + toasts). */
export const POWERUP_SLOT_ACCENT: Record<
  "strength" | "noBounce",
  { ready: string; depleted: string; shadow: string }
> = {
  strength: {
    ready:
      "linear-gradient(165deg, #ffffff 0%, #fff7ed 12%, #fed7aa 38%, #fb923c 62%, #ea580c 100%)",
    depleted:
      "linear-gradient(165deg, #edece8 0%, #d4c8bc 100%)",
    shadow: `${edgeLight}, 0 3px 10px rgba(220, 100, 20, 0.35)`,
  },
  noBounce: {
    ready:
      "linear-gradient(165deg, #ffffff 0%, #f5f3ff 14%, #ddd6fe 40%, #a78bfa 65%, #7c3aed 100%)",
    depleted:
      "linear-gradient(165deg, #edeaf0 0%, #c4b8d4 100%)",
    shadow: `${edgeLight}, 0 3px 10px rgba(124, 58, 237, 0.32)`,
  },
};

/** Toast bubble styling matching the corresponding power-up slot. */
export function powerupToastAccentStyle(
  slot: "strength" | "noBounce"
): Pick<
  CSSProperties,
  "color" | "textShadow" | "background" | "border" | "boxShadow"
> {
  const a = POWERUP_SLOT_ACCENT[slot];
  return {
    color: slot === "strength" ? "#7c2d12" : "#4c1d95",
    textShadow: "0 1px 0 rgba(255,255,255,0.45)",
    background: a.ready,
    border: "1px solid rgba(255,255,255,0.88)",
    boxShadow: `${edgeLight}, 0 4px 14px ${
      slot === "strength"
        ? "rgba(234, 88, 12, 0.28)"
        : "rgba(124, 58, 237, 0.28)"
    }`,
  };
}

/** One of five compact power-up slots in the aim panel (icon + value). */
export function powerupSlotStyle(opts: {
  variant: "ready" | "depleted" | "locked";
  /** When set, ready/depleted use a distinct tint (Strength vs No bounce). */
  accentSlot?: "strength" | "noBounce";
}): CSSProperties {
  const { variant, accentSlot } = opts;
  const locked = variant === "locked";
  const depleted = variant === "depleted";
  const accent = accentSlot ? POWERUP_SLOT_ACCENT[accentSlot] : null;

  const backgroundImage =
    locked
      ? glassDisabled
      : accent
        ? depleted
          ? accent.depleted
          : accent.ready
        : depleted
          ? glassDisabled
          : glassFace;

  const boxShadow =
    !locked && !depleted && accent ? accent.shadow : `${edgeLight}, ${dropSm}`;

  return {
    ...hudFont,
    ...(locked || depleted ? textOnGlossButtonDisabled : textOnGlossButton),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    flex: "1 1 0",
    minWidth: 0,
    minHeight: 40,
    padding: "5px 3px",
    borderRadius: 11,
    border: locked || depleted ? "1px solid #9ca8b4" : "1px solid rgba(255,255,255,0.9)",
    backgroundImage,
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1,
    cursor: locked ? "not-allowed" : depleted ? "not-allowed" : "pointer",
    opacity: locked ? 0.5 : depleted ? 0.58 : 1,
    boxShadow,
  };
}

export const progressTrack: CSSProperties = {
  width: "100%",
  maxWidth: 220,
  height: 7,
  borderRadius: 999,
  padding: 1,
  boxSizing: "border-box",
  background: "linear-gradient(180deg, #2d8a3e, #b8f0c8)",
  boxShadow: "inset 0 1px 4px rgba(0,0,0,0.18)",
};

export function progressFillStyle(
  pct: number,
  variant: "charge" | "cooldown"
): CSSProperties {
  const fill =
    variant === "charge"
      ? "linear-gradient(180deg, #f472b6, #db2777)"
      : "linear-gradient(180deg, #7dd3fc, #0072bc)";
  return {
    width: `${pct * 100}%`,
    height: "100%",
    borderRadius: 999,
    background: fill,
    transition:
      variant === "charge" ? "width 0.05s linear" : "width 0.1s linear",
  };
}

export const modalBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 12,
  background: "rgba(0, 90, 130, 0.38)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  pointerEvents: "auto",
};

export const modalCard: CSSProperties = {
  ...hudFont,
  ...panelBlur,
  maxWidth: 300,
  width: "min(90vw, 300px)",
  padding: "16px 14px",
  borderRadius: 18,
  background: "rgba(230, 248, 255, 0.92)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: `${edgeLight}, 0 16px 40px rgba(0, 82, 130, 0.22)`,
  textAlign: "center",
};

/** Wider, scrollable, left-aligned (help). */
export const helpModalCard: CSSProperties = {
  ...hudFont,
  ...panelBlur,
  maxWidth: 380,
  width: "min(94vw, 380px)",
  maxHeight: "min(78vh, 480px)",
  overflow: "auto",
  padding: "14px 16px",
  borderRadius: 18,
  background: "rgba(230, 248, 255, 0.92)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: `${edgeLight}, 0 16px 40px rgba(0, 82, 130, 0.22)`,
  textAlign: "left",
};
