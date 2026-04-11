/** Full document reload, then navigate — needed so WebGL / client state resets cleanly. */
export const PVP_PENDING_NAV_SESSION_KEY = "gg_pvp_pending_nav";

export function schedulePvpNavigateWithReload(path: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PVP_PENDING_NAV_SESSION_KEY, path);
  window.location.reload();
}
