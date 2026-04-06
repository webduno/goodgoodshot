import JSConfetti from "js-confetti";

let instance: JSConfetti | null = null;

function getConfetti(): JSConfetti | null {
  if (typeof window === "undefined") return null;
  if (!instance) {
    instance = new JSConfetti();
  }
  return instance;
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

export function burstFinishBattleConfetti() {
  const j = getConfetti();
  if (!j) return;
  void j.addConfetti({
    confettiNumber: 450,
    confettiColors: FINISH_BATTLE_COLORS,
    confettiRadius: 6,
  });
}
