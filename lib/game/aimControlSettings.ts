const STORAGE_KEY = "goodgoodshot-aim-control";

export type AimControlMode = "pad" | "buttons";

export function loadAimControlMode(): AimControlMode {
  if (typeof window === "undefined") return "pad";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "buttons") return "buttons";
    return "pad";
  } catch {
    return "pad";
  }
}

export function persistAimControlMode(mode: AimControlMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore quota / private mode */
  }
}
