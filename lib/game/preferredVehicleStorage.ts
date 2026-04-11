const STORAGE_KEY = "goodgoodshot.preferredVehicleId";

export function readPreferredVehicleId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const t = raw.trim();
    return t === "" ? null : t;
  } catch {
    return null;
  }
}

export function writePreferredVehicleId(vehicleId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, vehicleId.trim().toLowerCase());
  } catch {
    /* ignore */
  }
}

export function clearPreferredVehicleId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
