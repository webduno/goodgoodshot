/**
 * Predetermined vehicles live in `data/defaultVehicles.json` (defaults now; custom
 * builds can be merged in later). URL `?vehicle=<v_id>` picks a row when it matches.
 */
import defaultVehiclesJson from "@/data/defaultVehicles.json";

/** [r, g, b] in 0–255 — used for UI and theming. */
export type RgbTuple = readonly [number, number, number];

type JsonVehicle = {
  v_id: string;
  name: string;
  /** Primary RGB — main identity color. */
  mainRgb: [number, number, number];
  /** Secondary RGB — accent (e.g. gradients, highlights). */
  accentRgb: [number, number, number];
  strengthPerBaseClick: number;
  extraClickStrengthFraction: number;
  secondsBeforeShotTrigger: number;
  shotCooldownSeconds: number;
  gravityY: number;
  /** Degrees above horizontal; converted to radians at load time. */
  launchAngleDeg: number;
};

type DefaultVehiclesFile = {
  vehicles: JsonVehicle[];
};

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export type PlayerVehicleConfig = {
  /** Same as JSON `v_id` (lookup key). */
  id: string;
  name: string;
  mainRgb: RgbTuple;
  accentRgb: RgbTuple;
  strengthPerBaseClick: number;
  extraClickStrengthFraction: number;
  secondsBeforeShotTrigger: number;
  shotCooldownSeconds: number;
  gravityY: number;
  launchAngleRad: number;
};

export function rgbTupleToCss(rgb: RgbTuple): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function jsonVehicleToConfig(entry: JsonVehicle): PlayerVehicleConfig {
  return {
    id: entry.v_id,
    name: entry.name,
    mainRgb: entry.mainRgb,
    accentRgb: entry.accentRgb,
    strengthPerBaseClick: entry.strengthPerBaseClick,
    extraClickStrengthFraction: entry.extraClickStrengthFraction,
    secondsBeforeShotTrigger: entry.secondsBeforeShotTrigger,
    shotCooldownSeconds: entry.shotCooldownSeconds,
    gravityY: entry.gravityY,
    launchAngleRad: degToRad(entry.launchAngleDeg),
  };
}

const data = defaultVehiclesJson as DefaultVehiclesFile;

const byVId = new Map<string, PlayerVehicleConfig>();
for (const row of data.vehicles) {
  byVId.set(row.v_id.toLowerCase(), jsonVehicleToConfig(row));
}

export const DEFAULT_V_ID = "default" as const;

export const DEFAULT_PLAYER_VEHICLE: PlayerVehicleConfig =
  byVId.get(DEFAULT_V_ID) ?? jsonVehicleToConfig(data.vehicles[0]);

/** All rows from the JSON file, ready for UI or validation. */
export const PREDETERMINED_VEHICLES: PlayerVehicleConfig[] =
  data.vehicles.map(jsonVehicleToConfig);

export function getVehicleByVId(vId: string): PlayerVehicleConfig | undefined {
  return byVId.get(vId.trim().toLowerCase());
}

/**
 * Resolves which predetermined vehicle to use from the URL `vehicle` query param.
 * Missing, empty, or `default` uses the default build; unknown ids fall back to default.
 */
export function resolveVehicleFromUrlParam(
  vehicleParam: string | null | undefined
): PlayerVehicleConfig {
  if (vehicleParam == null) return DEFAULT_PLAYER_VEHICLE;
  const trimmed = vehicleParam.trim();
  if (trimmed === "" || trimmed.toLowerCase() === DEFAULT_V_ID) {
    return DEFAULT_PLAYER_VEHICLE;
  }
  return getVehicleByVId(trimmed) ?? DEFAULT_PLAYER_VEHICLE;
}

export function launchStrengthFromClicks(
  clicks: number,
  v: PlayerVehicleConfig
): number {
  const n = Math.max(1, clicks);
  return v.strengthPerBaseClick * (1 + v.extraClickStrengthFraction * (n - 1));
}

export function vehicleChargeMs(v: PlayerVehicleConfig): number {
  return v.secondsBeforeShotTrigger * 1000;
}

export function vehicleShotCooldownMs(v: PlayerVehicleConfig): number {
  return v.shotCooldownSeconds * 1000;
}
