import type { CSSProperties } from "react";

/** Shared HUD: compact gold accents on cream panels (lighter shadows than v1). */

export const hudFont: CSSProperties = {
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
};

const goldFace =
  "linear-gradient(155deg, #fff4d8 0%, #f0cd4a 50%, #b8890f 100%)";

const goldDisabled =
  "linear-gradient(155deg, #d4d4d8 0%, #a1a1aa 100%)";

const edgeLight = "inset 0 1px 0 rgba(255,255,255,0.42)";
const dropSm = "0 2px 5px rgba(60, 45, 8, 0.18)";

const textOnGold: CSSProperties = {
  color: "#1f1408",
  textShadow: "0 1px 0 rgba(255,255,255,0.25)",
};

export const hudColors = {
  label: "#57534e",
  value: "#422006",
  accent: "#a16207",
  muted: "#78716c",
} as const;

export const hudBottomPanel: CSSProperties = {
  ...hudFont,
  background: "rgba(255, 252, 248, 0.95)",
  border: "1px solid #dfc56a",
  borderRadius: 12,
  boxShadow: `${edgeLight}, ${dropSm}`,
  padding: "8px 10px 9px",
  maxWidth: 280,
  width: "min(92vw, 280px)",
};

export const hudMiniPanel: CSSProperties = {
  ...hudFont,
  background: "rgba(255, 252, 248, 0.95)",
  border: "1px solid #dfc56a",
  borderRadius: 10,
  boxShadow: `${edgeLight}, ${dropSm}`,
};

export function goldIconButtonStyle(disabled: boolean): CSSProperties {
  return {
    ...hudFont,
    ...textOnGold,
    width: 36,
    height: 32,
    borderRadius: 8,
    border: disabled ? "1px solid #b4b4b8" : "1px solid #e8d088",
    backgroundImage: disabled ? goldDisabled : goldFace,
    fontSize: 15,
    lineHeight: 1,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
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
    ...textOnGold,
    width: fullWidth ? "100%" : "auto",
    minWidth: fullWidth ? undefined : 120,
    padding: "5px 12px",
    borderRadius: 9999,
    border: disabled ? "1px solid #b4b4b8" : "1px solid #e8d088",
    backgroundImage: disabled ? goldDisabled : goldFace,
    fontSize: 11,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.48 : 1,
    boxShadow: `${edgeLight}, ${dropSm}`,
  };
}

/** Small top-bar control (e.g. Help). */
export function goldChipButtonStyle(): CSSProperties {
  return {
    ...hudFont,
    ...textOnGold,
    padding: "3px 9px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 999,
    border: "1px solid #e8d088",
    backgroundImage: goldFace,
    cursor: "pointer",
    boxShadow: `${edgeLight}, ${dropSm}`,
  };
}

/** One of five compact power-up slots in the aim panel (icon + value). */
export function powerupSlotStyle(opts: {
  variant: "ready" | "depleted" | "locked";
}): CSSProperties {
  const { variant } = opts;
  const locked = variant === "locked";
  const depleted = variant === "depleted";
  return {
    ...hudFont,
    ...textOnGold,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    flex: "1 1 0",
    minWidth: 0,
    minHeight: 38,
    padding: "4px 2px",
    borderRadius: 6,
    border: locked || depleted ? "1px solid #b4b4b8" : "1px solid #e8d088",
    backgroundImage: locked || depleted ? goldDisabled : goldFace,
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1,
    cursor: locked ? "not-allowed" : depleted ? "not-allowed" : "pointer",
    opacity: locked ? 0.42 : depleted ? 0.5 : 1,
    boxShadow: `${edgeLight}, ${dropSm}`,
  };
}

export const progressTrack: CSSProperties = {
  width: "100%",
  maxWidth: 220,
  height: 6,
  borderRadius: 999,
  padding: 1,
  boxSizing: "border-box",
  background: "linear-gradient(180deg, #9a7a18, #f0e4b8)",
  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
};

export function progressFillStyle(
  pct: number,
  variant: "charge" | "cooldown"
): CSSProperties {
  const fill =
    variant === "charge"
      ? "linear-gradient(180deg, #f0abfc, #c026d3)"
      : "linear-gradient(180deg, #7dd3fc, #0284c7)";
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
  background: "rgba(15, 15, 20, 0.5)",
  pointerEvents: "auto",
};

export const modalCard: CSSProperties = {
  ...hudFont,
  maxWidth: 300,
  width: "min(90vw, 300px)",
  padding: "16px 14px",
  borderRadius: 12,
  background: "rgba(255, 252, 248, 0.98)",
  border: "1px solid #dfc56a",
  boxShadow: `${edgeLight}, 0 12px 32px rgba(0,0,0,0.2)`,
  textAlign: "center",
};

/** Wider, scrollable, left-aligned (help). */
export const helpModalCard: CSSProperties = {
  ...hudFont,
  maxWidth: 380,
  width: "min(94vw, 380px)",
  maxHeight: "min(78vh, 480px)",
  overflow: "auto",
  padding: "14px 16px",
  borderRadius: 12,
  background: "rgba(255, 252, 248, 0.98)",
  border: "1px solid #dfc56a",
  boxShadow: `${edgeLight}, 0 12px 32px rgba(0,0,0,0.2)`,
  textAlign: "left",
};
