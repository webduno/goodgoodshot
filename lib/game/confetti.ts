import JSConfetti from "js-confetti";

let instance: JSConfetti | null = null;

function getConfetti(): JSConfetti | null {
  if (typeof window === "undefined") return null;
  if (!instance) {
    instance = new JSConfetti();
  }
  return instance;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixRgb(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

const WHITE: readonly [number, number, number] = [255, 255, 255];
const NEAR_BLACK: readonly [number, number, number] = [28, 28, 32];

/**
 * Confetti when buying a charge — matches HUD power-up slot accents
 * (`POWERUP_SLOT_ACCENT` in `gameHudStyles`).
 */
const POWERUP_BUY_COLORS: Record<
  "strength" | "noBounce" | "nowind" | "guideline",
  string[]
> = {
  strength: [
    "#ea580c",
    "#fb923c",
    "#f97316",
    "#fdba74",
    "#fed7aa",
    "#c2410c",
  ],
  noBounce: [
    "#7c3aed",
    "#a78bfa",
    "#8b5cf6",
    "#c4b5fd",
    "#ddd6fe",
    "#5b21b6",
  ],
  nowind: [
    "#0891b2",
    "#22d3ee",
    "#06b6d4",
    "#67e8f9",
    "#a5f3fc",
    "#0e7490",
  ],
  guideline: [
    "#0d9488",
    "#14b8a6",
    "#2dd4bf",
    "#5eead4",
    "#99f6e4",
    "#115e59",
  ],
};

export function burstPowerupBuyConfetti(
  slot: "strength" | "noBounce" | "nowind" | "guideline"
) {
  const j = getConfetti();
  if (!j) return;
  void j.addConfetti({
    confettiNumber: 160,
    confettiColors: POWERUP_BUY_COLORS[slot],
    confettiRadius: 5,
  });
}

/** Small burst when a power-up is activated (lighter than buying a charge). */
export function burstPowerupUseConfetti(
  slot: "strength" | "noBounce" | "nowind" | "guideline"
) {
  const j = getConfetti();
  if (!j) return;
  void j.addConfetti({
    confettiNumber: 52,
    confettiColors: POWERUP_BUY_COLORS[slot],
    confettiRadius: 3,
  });
}

const SHOT_GREY_COLORS = [
  "#9ca3af",
  "#6b7280",
  "#d1d5db",
  "#e5e7eb",
  "#4b5563",
  "#cbd5e1",
  "#78716c",
];

/** Small neutral burst when the ball is launched. */
export function burstShotGreyConfetti() {
  const j = getConfetti();
  if (!j) return;
  void j.addConfetti({
    confettiNumber: 40,
    confettiColors: SHOT_GREY_COLORS,
    confettiRadius: 3,
  });
}

/** Session start / Continue — uses the selected vehicle’s main + accent RGB. */
export function burstVehicleStartConfetti(
  mainRgb: readonly [number, number, number],
  accentRgb: readonly [number, number, number]
) {
  const j = getConfetti();
  if (!j) return;
  const palette = [
    rgbToHex(...mainRgb),
    rgbToHex(...accentRgb),
    rgbToHex(...mixRgb(mainRgb, WHITE, 0.38)),
    rgbToHex(...mixRgb(mainRgb, accentRgb, 0.52)),
    rgbToHex(...mixRgb(accentRgb, WHITE, 0.28)),
    rgbToHex(...mixRgb(mainRgb, NEAR_BLACK, 0.32)),
    rgbToHex(...mixRgb(accentRgb, NEAR_BLACK, 0.22)),
  ];
  void j.addConfetti({
    confettiNumber: 140,
    confettiColors: palette,
    confettiRadius: 4,
  });
}

/** Rich palette for end-of-battle modal. */
const FINISH_BATTLE_COLORS = [
  "#ff6b6b",
  "#feca57",
  "#48dbfb",
  "#ff9ff3",
  "#54a0ff",
  "#5f27cd",
  "#00d2d3",
  "#ff9f43",
  "#10ac84",
  "#ee5a24",
  "#0abde3",
  "#e056fd",
  "#686de0",
  "#ff7979",
  "#badc58",
  "#f9ca24",
  "#6ab04c",
  "#eb4d4b",
  "#fff200",
  "#c44569",
  "#22a6b3",
];

/** Messenger-style kill reward (blue + white chips). */
export function burstMessengerKillConfetti() {
  const j = getConfetti();
  if (!j) return;
  void j.addConfetti({
    confettiNumber: 120,
    confettiColors: [
      "#0084ff",
      "#33b4ff",
      "#66c7ff",
      "#ffffff",
      "#e8f4ff",
      "#0066cc",
    ],
    confettiRadius: 4,
  });
}

export function burstFinishBattleConfetti() {
  const j = getConfetti();
  if (!j) return;
  void j.addConfetti({
    confettiNumber: 450,
    confettiColors: FINISH_BATTLE_COLORS,
    confettiRadius: 6,
  });
}
