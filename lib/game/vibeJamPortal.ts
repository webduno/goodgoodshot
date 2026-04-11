/** Vibe Jam 2026 webring — exit / return URLs (see https://vibej.am portal docs). */

export const VIBE_JAM_PORTAL_2026_URL = "https://vibej.am/portal/2026";

export function rgbTupleToHex(r: number, g: number, b: number): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Canonical plaza URL for `ref=` (vehicle preserved when present). */
export function buildPlazaCanonicalRefUrl(opts: {
  origin: string;
  pathname: string;
  vehicleId: string | null;
}): string {
  const base = `${opts.origin}${opts.pathname}`;
  if (opts.vehicleId && opts.vehicleId.length > 0) {
    return `${base}?vehicle=${encodeURIComponent(opts.vehicleId)}`;
  }
  return base;
}

export function buildVibeJamExitUrl(opts: {
  username: string;
  colorHex: string;
  speedMps: number;
  refUrl: string;
}): string {
  const u = new URL(VIBE_JAM_PORTAL_2026_URL);
  u.searchParams.set("username", opts.username);
  u.searchParams.set("color", opts.colorHex);
  const s = opts.speedMps;
  u.searchParams.set(
    "speed",
    Number.isFinite(s) ? String(Math.round(s * 100) / 100) : "0"
  );
  u.searchParams.set("ref", opts.refUrl);
  return u.toString();
}

function parseAbsoluteOrRelativeUrl(ref: string, baseOrigin: string): URL | null {
  try {
    return new URL(ref);
  } catch {
    try {
      return new URL(ref, baseOrigin);
    } catch {
      return null;
    }
  }
}

/**
 * Redirect to the previous game (`ref`), forwarding incoming portal params and setting
 * `portal=true` and `ref` back to this game.
 */
export function buildVibeJamReturnNavigationUrl(opts: {
  previousGameRef: string;
  /** Params from the current page query (typically includes continuity fields). */
  incomingParams: URLSearchParams;
  /** This game's URL for the next game's return portal. */
  currentGameRefUrl: string;
  baseOrigin: string;
}): string | null {
  const target = parseAbsoluteOrRelativeUrl(
    opts.previousGameRef,
    opts.baseOrigin
  );
  if (!target) return null;

  for (const [k, v] of opts.incomingParams) {
    if (k === "ref") continue;
    target.searchParams.set(k, v);
  }
  target.searchParams.set("portal", "true");
  target.searchParams.set("ref", opts.currentGameRefUrl);
  return target.toString();
}
