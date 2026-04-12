const STORAGE_KEY = "goodgoodshot-bgm-enabled";

/** When false, `startBgmLoop` no-ops until the user turns music back on in the menu. */
export function loadBgmUserEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

export function persistBgmUserEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}
