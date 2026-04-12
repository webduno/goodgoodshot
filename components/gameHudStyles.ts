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

/** Glossy violet / orchid — multiplayer / online (Frutiger Aero; contrasts cyan solo tiles). */
export const glassFaceMultiplayer =
  "linear-gradient(165deg, #ffffff 0%, #f3e8ff 14%, #d8b4fe 38%, #9333ea 66%, #6b21a8 100%)";

/** Glossy red glass for primary Fire control. */
const glassFaceRed =
  "linear-gradient(165deg, #ffffff 0%, #fecaca 16%, #fb7185 44%, #dc2626 78%, #991b1b 100%)";

/** Orange — charge window active (first tap started). */
const glassFaceFireCharging =
  "linear-gradient(165deg, #ffffff 0%, #ffedd5 14%, #fdba74 38%, #ea580c 72%, #9a3412 100%)";

const edgeLight = "inset 0 1px 0 rgba(255,255,255,0.55)";
const dropSm = "0 3px 10px rgba(0, 82, 130, 0.22)";
const dropSmRed = "0 3px 12px rgba(160, 28, 28, 0.42)";
const dropSmOrange = "0 3px 12px rgba(220, 100, 20, 0.38)";

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
  gap: 3,
  pointerEvents: "auto",
  userSelect: "none",
  padding: "1px 0",
  borderRadius: 14,
  width: "fit-content",
  boxSizing: "border-box",
  backgroundColor: "rgba(230, 248, 255, 0.35)",
  backgroundImage: [
    "radial-gradient(ellipse 130% 95% at 50% -5%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.35) 48%, transparent 58%)",
    "linear-gradient(165deg, rgba(255,255,255,0.88) 0%, rgba(210, 244, 255, 0.5) 32%, rgba(120, 210, 245, 0.28) 68%, rgba(0, 130, 195, 0.18) 100%)",
    "linear-gradient(180deg, rgba(0, 174, 239, 0.12) 0%, transparent 42%, rgba(0, 90, 140, 0.1) 100%)",
  ].join(", "),
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
};

/** Inner width of aim strip: horizontal padding 0, four 36px buttons, three 3px gaps (matches `hudAimPanelStrip`). */
export const HUD_AIM_STRIP_CONTENT_WIDTH_PX = 36 * 4 + 3 * 3;

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
    height: 36,
    borderRadius: "50%",
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

/** Destructive pill (e.g. end session) — glossy red, white label. */
export function dangerPillButtonStyle(opts: {
  disabled?: boolean;
  fullWidth?: boolean;
}): CSSProperties {
  const { disabled = false, fullWidth } = opts;
  return {
    ...hudFont,
    ...(disabled ? textOnGlossButtonDisabled : textOnGlossButton),
    width: fullWidth ? "100%" : "auto",
    minWidth: fullWidth ? undefined : 120,
    padding: "6px 14px",
    borderRadius: 9999,
    border: disabled ? "1px solid #9ca8b4" : "1px solid rgba(255,255,255,0.85)",
    backgroundImage: disabled ? glassDisabled : glassFaceRed,
    fontSize: 11,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.72 : 1,
    boxShadow: `${edgeLight}, ${dropSmRed}`,
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

/**
 * Plaza top bar — glossy cyan → cerulean capsule (Menu).
 */
export function plazaGlassCapsuleButtonStyle(): CSSProperties {
  const face = [
    "radial-gradient(ellipse 130% 115% at 16% 10%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 32%, transparent 56%)",
    "linear-gradient(158deg, #f0fdff 0%, #7ee8ff 14%, #38bdf8 40%, #0b7dd4 70%, #0369a1 100%)",
  ].join(", ");
  return {
    ...hudFont,
    ...textOnGlossButton,
    padding: "7px 14px",
    minHeight: 30,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.02em",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.95)",
    boxSizing: "border-box",
    backgroundImage: face,
    backgroundColor: "#0284c7",
    cursor: "pointer",
    boxShadow: [
      "inset 0 1px 0 rgba(255,255,255,0.68)",
      "inset 0 -1px 0 rgba(0, 55, 100, 0.14)",
      "0 4px 14px rgba(0, 75, 130, 0.3)",
    ].join(", "),
  };
}

/**
 * Plaza top bar — Multiplayer: same violet glass as landing “Multiplayer / Online” tile.
 */
export function plazaMultiplayerCapsuleButtonStyle(): CSSProperties {
  return {
    ...hudFont,
    ...textOnGlossButton,
    padding: "7px 14px",
    minHeight: 30,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.02em",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.92)",
    boxSizing: "border-box",
    backgroundImage: glassFaceMultiplayer,
    backgroundColor: "#6b21a8",
    cursor: "pointer",
    boxShadow: [
      "inset 0 2px 0 rgba(255,255,255,0.58)",
      "inset 0 -1px 0 rgba(60, 20, 100, 0.12)",
      "0 4px 14px rgba(88, 28, 135, 0.38)",
      "0 0 0 1px rgba(147, 51, 234, 0.12)",
    ].join(", "),
  };
}

/** Glossy Frutiger Aero gradients — plaza PvP dock only; each action reads distinct in-game. */
const pvpGlassCreate =
  "linear-gradient(165deg, #ffffff 0%, #cffafe 14%, #22d3ee 42%, #0891b2 72%, #155e75 100%)";
const pvpGlassJoin =
  "linear-gradient(165deg, #ffffff 0%, #dbeafe 14%, #38bdf8 44%, #0284c7 74%, #075985 100%)";
const pvpGlassQuick =
  "linear-gradient(165deg, #ffffff 0%, #ecfccb 10%, #a3e635 38%, #65a30d 68%, #3f6212 100%)";

const pvpEdgeLight = "inset 0 1px 0 rgba(255,255,255,0.62)";
const pvpDrop = "0 4px 14px rgba(0, 55, 95, 0.28)";
const pvpDropGreen = "0 4px 14px rgba(55, 95, 20, 0.32)";

/**
 * Plaza top-right PvP trio — chunky glossy pills, distinct per action (Frutiger Aero).
 */
export function plazaPvpDockButtonStyle(opts: {
  variant: "create" | "join" | "quick";
  disabled: boolean;
}): CSSProperties {
  const { variant, disabled } = opts;
  const face =
    variant === "create"
      ? pvpGlassCreate
      : variant === "join"
        ? pvpGlassJoin
        : pvpGlassQuick;
  const drop = variant === "quick" ? pvpDropGreen : pvpDrop;
  return {
    ...hudFont,
    ...(disabled ? textOnGlossButtonDisabled : textOnGlossButton),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "7px 14px",
    minHeight: 30,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.02em",
    borderRadius: 999,
    border: disabled ? "1px solid #9ca8b4" : "1px solid rgba(255,255,255,0.92)",
    backgroundImage: disabled ? glassDisabled : face,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.72 : 1,
    boxShadow: `${pvpEdgeLight}, ${drop}`,
    textTransform: "none" as const,
  };
}

const plazaHubGlassText: CSSProperties = {
  ...hudFont,
  color: "#ffffff",
  textShadow:
    "0 1px 2px rgba(0, 55, 45, 0.7), 0 0 1px rgba(0, 45, 35, 0.45)",
};

const plazaHubGradient =
  "linear-gradient(165deg, #ecfdf5 0%, #6ee7b7 24%, #059669 55%, #065f46 100%)";

const plazaHubShadow =
  "inset 0 1px 0 rgba(255,255,255,0.55), 0 3px 12px rgba(5, 95, 70, 0.38)";

/**
 * Plaza hub navigation — emerald glass, distinct from default blue HUD buttons.
 * Use everywhere “Plaza” / “Go to plaza” / “Tutorial plaza” appears.
 */
export function plazaHubButtonStyle(opts?: {
  fullWidth?: boolean;
  variant?: "chip" | "compact" | "full";
}): CSSProperties {
  const variant = opts?.variant ?? "full";
  const fullWidth = opts?.fullWidth ?? false;
  const padding =
    variant === "chip"
      ? "5px 12px"
      : variant === "compact"
        ? "10px 14px"
        : "12px 14px";
  const fontSize = variant === "chip" ? 11 : variant === "compact" ? 12 : 13;
  return {
    ...plazaHubGlassText,
    padding,
    fontSize,
    fontWeight: 700,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.88)",
    backgroundImage: plazaHubGradient,
    cursor: "pointer",
    boxShadow: plazaHubShadow,
    width: fullWidth ? "100%" : "auto",
    boxSizing: "border-box",
  };
}

/** Round bottom-dock actions (Power-ups, Fire). */
export const HUD_ROUND_ACTION_PX = 68;

/**
 * Power-up flyout panel: must stay narrower than `HUD_ROUND_ACTION_PX` so it
 * sits visually inside the toggle’s footprint.
 */
export const HUD_POWERUP_MENU_MAX_WIDTH_PX = HUD_ROUND_ACTION_PX - 6;

/** Circular blue glass — bottom-dock Power-ups. */
export function hudRoundPowerupButtonStyle(disabled: boolean): CSSProperties {
  return {
    ...hudFont,
    ...(disabled ? textOnGlossButtonDisabled : textOnGlossButton),
    width: HUD_ROUND_ACTION_PX,
    height: HUD_ROUND_ACTION_PX,
    padding: 0,
    borderRadius: "50%",
    border: disabled ? "1px solid #9ca8b4" : "1px solid rgba(255,255,255,0.9)",
    backgroundImage: disabled ? glassDisabled : glassFace,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.72 : 1,
    boxShadow: `${edgeLight}, ${dropSm}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    flexShrink: 0,
  };
}

export type FireButtonHudVariant =
  | "ready"
  | "charging"
  | "disabled"
  | "guidelineReady";

/** Circular Fire — bottom dock: red (ready), orange (charging), grey (shot / cooldown / locked). */
export function hudRoundFireButtonStyle(
  variant: FireButtonHudVariant
): CSSProperties {
  const disabled = variant === "disabled";
  const charging = variant === "charging";
  const guidelineReady = variant === "guidelineReady";
  const bg = disabled
    ? glassDisabled
    : charging
      ? glassFaceFireCharging
      : guidelineReady
        ? POWERUP_SLOT_ACCENT.guideline.ready
        : glassFaceRed;
  const shadow = disabled
    ? dropSm
    : charging
      ? dropSmOrange
      : guidelineReady
        ? POWERUP_SLOT_ACCENT.guideline.shadow
        : dropSmRed;
  const text = disabled
    ? textOnGlossButtonDisabled
    : charging
      ? {
          color: "#7c2d12",
          textShadow:
            "0 1px 2px rgba(80, 30, 0, 0.35), 0 0 1px rgba(80, 30, 0, 0.25)",
        }
      : guidelineReady
        ? {
            color: "#134e4a",
            textShadow:
              "0 1px 2px rgba(255, 255, 255, 0.45), 0 0 1px rgba(19, 78, 74, 0.35)",
          }
        : textOnGlossButton;
  return {
    ...hudFont,
    ...text,
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
    touchAction: "manipulation",
    width: HUD_ROUND_ACTION_PX,
    height: HUD_ROUND_ACTION_PX,
    padding: 0,
    borderRadius: "50%",
    border: disabled ? "1px solid #9ca8b4" : "1px solid rgba(255,255,255,0.9)",
    backgroundImage: bg,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.72 : 1,
    boxShadow: `${edgeLight}, ${shadow}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 700,
  };
}

/** Distinct glass tints for power-up slots (HUD + toasts). */
export const POWERUP_SLOT_ACCENT: Record<
  "strength" | "noBounce" | "nowind" | "guideline",
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
  nowind: {
    ready:
      "linear-gradient(165deg, #ffffff 0%, #ecfeff 12%, #a5f3fc 42%, #22d3ee 68%, #0891b2 100%)",
    depleted:
      "linear-gradient(165deg, #e8ecee 0%, #b8c5ca 100%)",
    shadow: `${edgeLight}, 0 3px 10px rgba(8, 145, 178, 0.32)`,
  },
  guideline: {
    ready:
      "linear-gradient(165deg, #ffffff 0%, #f0fdfa 12%, #99f6e4 40%, #2dd4bf 65%, #0d9488 100%)",
    depleted:
      "linear-gradient(165deg, #e8ecea 0%, #b8c4c0 100%)",
    shadow: `${edgeLight}, 0 3px 10px rgba(13, 148, 136, 0.32)`,
  },
};

/**
 * sRGB 0–1 for lightweight 3D particles — dominant stops from `POWERUP_SLOT_ACCENT` gradients.
 */
export const POWERUP_WORLD_RGB: Record<
  "strength" | "noBounce" | "nowind",
  readonly [number, number, number]
> = {
  strength: [234 / 255, 88 / 255, 12 / 255],
  noBounce: [124 / 255, 58 / 255, 237 / 255],
  nowind: [8 / 255, 145 / 255, 178 / 255],
};

/** Toast bubble styling matching the corresponding power-up slot. */
export function powerupToastAccentStyle(
  slot: "strength" | "noBounce" | "nowind" | "guideline"
): Pick<
  CSSProperties,
  "color" | "textShadow" | "background" | "border" | "boxShadow"
> {
  const a = POWERUP_SLOT_ACCENT[slot];
  const shadowTint =
    slot === "strength"
      ? "rgba(234, 88, 12, 0.28)"
      : slot === "noBounce"
        ? "rgba(124, 58, 237, 0.28)"
        : slot === "nowind"
          ? "rgba(8, 145, 178, 0.28)"
          : "rgba(13, 148, 136, 0.28)";
  const text =
    slot === "strength"
      ? "#7c2d12"
      : slot === "noBounce"
        ? "#4c1d95"
        : slot === "nowind"
          ? "#0c4a5e"
          : "#134e4a";
  return {
    color: text,
    textShadow: "0 1px 0 rgba(255,255,255,0.45)",
    background: a.ready,
    border: "1px solid rgba(255,255,255,0.88)",
    boxShadow: `${edgeLight}, 0 4px 14px ${shadowTint}`,
  };
}

/** Compact power-up slots in the aim panel (icon + value). */
export function powerupSlotStyle(opts: {
  variant: "ready" | "depleted" | "locked";
  /** When set, ready/depleted use a distinct tint. */
  accentSlot?: "strength" | "noBounce" | "nowind" | "guideline";
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

const progressTrackShared: CSSProperties = {
  width: HUD_AIM_STRIP_CONTENT_WIDTH_PX,
  maxWidth: HUD_AIM_STRIP_CONTENT_WIDTH_PX,
  height: 7,
  borderRadius: 999,
  padding: 1,
  boxSizing: "border-box",
  background: "#ffffff",
  boxShadow: "inset 0 1px 4px rgba(0,0,0,0.18)",
};

/** Charge / cooldown timer bar — same width as aim button row. */
export const progressTrack: CSSProperties = {
  ...progressTrackShared,
};

/** Strength build-up bar (above timer during charge). */
export const progressTrackStrength: CSSProperties = {
  ...progressTrackShared,
};

/** Right-side vertical fire power meter (above Fire button). */
export const FIRE_POWER_VERTICAL_TRACK_HEIGHT_PX = 132;
export const FIRE_POWER_VERTICAL_TRACK_WIDTH_PX = 14;

const progressTrackVerticalShared: CSSProperties = {
  width: FIRE_POWER_VERTICAL_TRACK_WIDTH_PX,
  maxWidth: FIRE_POWER_VERTICAL_TRACK_WIDTH_PX,
  height: FIRE_POWER_VERTICAL_TRACK_HEIGHT_PX,
  borderRadius: 999,
  padding: 1,
  boxSizing: "border-box",
  background: "#ffffff",
  boxShadow: "inset 0 1px 4px rgba(0,0,0,0.18)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  overflow: "hidden",
};

export const progressTrackVerticalStrength: CSSProperties = {
  ...progressTrackVerticalShared,
};

export function progressFillStyleVertical(
  pct: number,
  variant: "charge" | "cooldown" | "strength"
): CSSProperties {
  const fill =
    variant === "charge"
      ? "linear-gradient(180deg, #f472b6, #db2777)"
      : variant === "cooldown"
        ? "linear-gradient(180deg, #7dd3fc, #0072bc)"
        : "linear-gradient(180deg, #fb923c, #ea580c)";
  return {
    width: "100%",
    height: `${pct * 100}%`,
    minHeight: pct > 0 ? 2 : 0,
    borderRadius: 999,
    background: fill,
    flexShrink: 0,
    transition:
      variant === "charge" || variant === "strength"
        ? "height 0.05s linear"
        : "height 0.1s linear",
  };
}

export function progressFillStyle(
  pct: number,
  variant: "charge" | "cooldown" | "strength"
): CSSProperties {
  const fill =
    variant === "charge"
      ? "linear-gradient(180deg, #f472b6, #db2777)"
      : variant === "cooldown"
        ? "linear-gradient(180deg, #7dd3fc, #0072bc)"
        : "linear-gradient(180deg, #fb923c, #ea580c)";
  return {
    width: `${pct * 100}%`,
    height: "100%",
    borderRadius: 999,
    background: fill,
    transition:
      variant === "charge" || variant === "strength"
        ? "width 0.05s linear"
        : "width 0.1s linear",
  };
}

/** Above `modalBackdrop` (50) and nested overlays (e.g. confirm at 60). */
export const hudToastZIndex = 70;

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

/** Wider, scrollable, left-aligned (help / menu) — chunky “game panel” depth. */
export const helpModalCard: CSSProperties = {
  ...hudFont,
  ...panelBlur,
  maxWidth: 380,
  width: "min(94vw, 380px)",
  maxHeight: "min(78vh, 520px)",
  overflow: "auto",
  padding: "16px 16px 14px",
  borderRadius: 22,
  backgroundColor: "rgba(210, 238, 255, 0.94)",
  backgroundImage: [
    "radial-gradient(ellipse 110% 70% at 50% -8%, rgba(255,255,255,0.92) 0%, transparent 58%)",
    "linear-gradient(168deg, rgba(255,255,255,0.98) 0%, rgba(200, 236, 255, 0.72) 42%, rgba(0, 150, 215, 0.22) 100%)",
  ].join(", "),
  border: "2px solid rgba(255,255,255,0.92)",
  boxShadow: [
    "inset 0 2px 0 rgba(255,255,255,0.72)",
    "inset 0 -3px 0 rgba(0, 55, 95, 0.1)",
    "0 0 0 1px rgba(0, 55, 95, 0.32)",
    "0 8px 0 rgba(0, 45, 85, 0.14)",
    "0 22px 48px rgba(0, 35, 75, 0.38)",
  ].join(", "),
  textAlign: "left",
};
