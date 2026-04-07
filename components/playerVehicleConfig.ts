/**
 * Predetermined vehicles live in `data/defaultVehicles.json` (defaults now; custom
 * builds can be merged in later). URL `?vehicle=<v_id>` picks a row when it matches.
 */
import defaultVehiclesJson from "@/data/defaultVehicles.json";

/** [r, g, b] in 0–255 — used for UI and theming. */
export type RgbTuple = readonly [number, number, number];

/**
 * Single primitive in a composite vehicle mesh (local space; origin = spawn block center).
 * - `cube`: `size` = width, height, depth.
 * - `cylinder`: `size` = [radius, height, radialSegments] (Y-up; rotate group to aim barrel).
 * - `sphere`: `size` = [radius, widthSegments, heightSegments] (low-poly).
 */
export type VehicleBodyPart = {
  type: "cube" | "cylinder" | "sphere";
  pos: readonly [number, number, number];
  size: readonly [number, number, number];
  rotDeg?: readonly [number, number, number];
  color?: "main" | "accent" | RgbTuple;
  /** Pull forward slightly in depth to avoid z-fighting with overlapping hulls. */
  polygonOffset?: boolean;
};

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
  /**
   * How many times the ball may leave the ground after the first impact (0 = stops on first touch).
   */
  landingBounces?: number;
  /** Vertical speed multiplier on each bounce (0–1). Defaults when omitted. */
  bounceRestitution?: number;
  /**
   * Horizontal speed loss while rolling on the ground (world units/s²). 0 = no roll; ball stops on final touch.
   */
  rollDeceleration?: number;
  /** Composite hull; omit or empty only for the default single-box vehicle. */
  bodyParts?: VehicleBodyPart[];
  /**
   * Optional textured mesh (public URL to `.obj`; sibling `.mtl` / textures loaded automatically).
   * When set, this replaces primitive `bodyParts` in the scene (unless both are missing — then default box).
   */
  meshObjPath?: string;
  /** Extra local yaw on the OBJ hull after auto-fit (degrees → radians at load). */
  meshObjYawOffsetDeg?: number;
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
  /** Rebound count after first ground contact (0 = no bounces). */
  landingBounces: number;
  /** Inbound vertical speed multiplier on each bounce. */
  bounceRestitution: number;
  /** Ground roll: magnitude deceleration on horizontal velocity (0 = none). */
  rollDeceleration: number;
  /** Composite primitives; when missing/empty and id is `default`, scene uses one box. */
  bodyParts: readonly VehicleBodyPart[] | undefined;
  /** Textured `.obj` hull (see `meshObjPath` in JSON). */
  meshObjPath: string | undefined;
  meshObjYawOffsetRad: number;
};

export function rgbTupleToCss(rgb: RgbTuple): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

const DEFAULT_LANDING_BOUNCES = 0;
const DEFAULT_BOUNCE_RESTITUTION = 0.55;
const DEFAULT_ROLL_DECELERATION = 0;

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
    landingBounces: entry.landingBounces ?? DEFAULT_LANDING_BOUNCES,
    bounceRestitution: entry.bounceRestitution ?? DEFAULT_BOUNCE_RESTITUTION,
    rollDeceleration: entry.rollDeceleration ?? DEFAULT_ROLL_DECELERATION,
    bodyParts: entry.bodyParts,
    meshObjPath: entry.meshObjPath,
    meshObjYawOffsetRad: degToRad(entry.meshObjYawOffsetDeg ?? 0),
  };
}

const data = defaultVehiclesJson as unknown as DefaultVehiclesFile;

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

/**
 * Click count where the vertical strength bar reads as full (no overflow segment).
 * Same formula as `strengthBarRefBounds` in `FirePowerVerticalHud` / `ShotHud`.
 */
export function maxClicksForStrengthBarRef(v: PlayerVehicleConfig): number {
  return Math.max(2, Math.round(v.secondsBeforeShotTrigger * 16) + 1);
}

/** Midpoint of the reference strength bar (default guideline preview). */
export function halfClicksForStrengthBarRef(v: PlayerVehicleConfig): number {
  const max = maxClicksForStrengthBarRef(v);
  if (max <= 1) return 1;
  return Math.round(1 + (max - 1) / 2);
}

export function vehicleChargeMs(v: PlayerVehicleConfig): number {
  return v.secondsBeforeShotTrigger * 1000;
}

export function vehicleShotCooldownMs(v: PlayerVehicleConfig): number {
  return v.shotCooldownSeconds * 1000;
}
