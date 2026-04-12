"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import { usePlayerStats } from "@/components/PlayerStatsProvider";
import {
  DEFAULT_V_ID,
  PREDETERMINED_VEHICLES,
} from "@/components/playerVehicleConfig";
import {
  goldChipButtonStyle,
  goldPillButtonStyle,
  helpModalCard,
  hudColors,
  hudFont,
  modalBackdrop,
} from "@/components/gameHudStyles";
import { writePreferredVehicleId } from "@/lib/game/preferredVehicleStorage";
import { isVehicleUnlocked } from "@/lib/game/vehicleUnlock";
import { FISH_SHOP_ITEMS, AQUARIUM_SHOP_ITEMS } from "@/lib/shop/aquariumCatalog";
import { BIRD_SHOP_ITEMS } from "@/lib/shop/birdCatalog";
import { HAT_CATALOG } from "@/lib/shop/hatCatalog";
import type { FishId, HatId, PlayerShopInventory } from "@/lib/shop/playerInventory";
import { usePlayerShopInventory } from "@/lib/shop/usePlayerShopInventory";
import { VEHICLE_SHOP_CATALOG } from "@/lib/shop/vehicleCatalog";
import {
  linkEmailAndPasswordToCurrentUser,
  mapAuthPasswordError,
  sessionUserNeedsEmailLink,
  signInWithEmailPassword,
} from "@/lib/profile/accountAuth";
import { flushPlayerProgressToServer } from "@/lib/profile/playerProgressSync";
import {
  fetchPlayerUsername,
  mapUsernameRpcError,
  savePlayerUsernameOnce,
  validateUsernameInput,
} from "@/lib/profile/playerUsername";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureSupabaseSession } from "@/lib/supabase/ensureSession";

const HAT_SHOP_EMOJI: Record<HatId, string> = {
  glassPyramid: "🔺",
  glassCube: "📦",
  glassSphere: "🔮",
  pandaFace: "🐼",
  messengerMini: "🦠",
  topHat: "🎩",
  simsPlumbob: "💎",
  bunnyEars: "🐰",
  crownHat: "👑",
};

function vehicleShopEmoji(vehicleId: string): string {
  const id = vehicleId.trim().toLowerCase();
  const map: Record<string, string> = {
    "scrap-crawler": "🛞",
    "drift-sprinter": "🏎️",
    "arc-lobber": "🎯",
    "meshy-ratata": "🐭",
  };
  return map[id] ?? "🚗";
}

function vehicleOwnedInShop(
  vehicleId: string,
  inv: PlayerShopInventory
): boolean {
  const needle = vehicleId.trim().toLowerCase();
  return inv.ownedVehicleIds.some((id) => id.trim().toLowerCase() === needle);
}

function vehicleIdEq(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function equipVehicleAndReload(vId: string) {
  writePreferredVehicleId(vId);
  const url = new URL(window.location.href);
  if (vId === DEFAULT_V_ID) {
    url.searchParams.delete("vehicle");
  } else {
    url.searchParams.set("vehicle", vId);
  }
  window.location.assign(url.toString());
}

type ProfileInvRow = {
  key: string;
  emoji: string;
  title: string;
  detail: string;
  accent?: string;
  /** Set for vehicle rows — used for Equip / Unequip. */
  vehicleId?: string;
};

const invGridStyle: CSSProperties = {
  ...hudFont,
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
};

const invCellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 4,
  minHeight: 88,
  padding: "8px 6px",
  borderRadius: 12,
  border: "1px solid rgba(0, 55, 95, 0.18)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(232, 246, 255, 0.75) 100%)",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
};

export function ProfileModal({
  open,
  onClose,
  currentVehicleId,
}: {
  open: boolean;
  onClose: () => void;
  /** Active hull (from URL / preference) — only one vehicle is equipped at a time. */
  currentVehicleId: string;
}) {
  const { stats } = usePlayerStats();
  const {
    inventory: shopInventory,
    setEquippedHatId,
    setEquippedFishId,
  } = usePlayerShopInventory();

  const [username, setUsername] = useState<string | null>(null);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameFetchDone, setUsernameFetchDone] = useState(false);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [authNeedsEmailLink, setAuthNeedsEmailLink] = useState(true);

  const [pwFormOpen, setPwFormOpen] = useState(false);
  const [pwEmail, setPwEmail] = useState("");
  const [pwPassword, setPwPassword] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginSaving, setLoginSaving] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const inputStyle: CSSProperties = {
    ...hudFont,
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0, 114, 188, 0.22)",
    fontSize: 14,
    fontWeight: 600,
    color: hudColors.value,
    background: "rgba(255,255,255,0.92)",
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setUsernameError(null);
    setUsernameFetchDone(false);
    setPwError(null);
    setPwSuccess(null);
    setPwFormOpen(false);
    setLoginError(null);
    void (async () => {
      try {
        await ensureSupabaseSession();
        if (cancelled) return;
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) setAuthNeedsEmailLink(sessionUserNeedsEmailLink(user));
        const u = await fetchPlayerUsername();
        if (cancelled) return;
        setUsername(u);
        setUsernameDraft(u ?? "");
      } catch (e) {
        if (!cancelled) {
          setUsernameError(
            e instanceof Error ? e.message : "Could not load username."
          );
        }
      } finally {
        if (!cancelled) setUsernameFetchDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const onCreatePassword = useCallback(async () => {
    setPwError(null);
    setPwSuccess(null);
    const email = pwEmail.trim();
    if (!email.includes("@") || email.length < 5) {
      setPwError("Enter a valid email.");
      return;
    }
    if (pwPassword.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    if (pwPassword !== pwConfirm) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwSaving(true);
    try {
      await ensureSupabaseSession();
      await linkEmailAndPasswordToCurrentUser(email, pwPassword);
      setAuthNeedsEmailLink(false);
      setPwSuccess(
        "Check your email to confirm the link. After that you can sign in on other devices."
      );
    } catch (e) {
      const raw =
        e instanceof Error && e.message ? e.message : "Could not save password.";
      setPwError(mapAuthPasswordError(raw));
    } finally {
      setPwSaving(false);
    }
  }, [pwEmail, pwPassword, pwConfirm]);

  const onProfileLogin = useCallback(async () => {
    setLoginError(null);
    const email = loginEmail.trim();
    if (!email.includes("@") || email.length < 5) {
      setLoginError("Enter a valid email.");
      return;
    }
    if (loginPassword.length < 1) {
      setLoginError("Enter your password.");
      return;
    }
    setLoginSaving(true);
    try {
      await signInWithEmailPassword(email, loginPassword);
      window.location.reload();
    } catch (e) {
      const raw =
        e instanceof Error && e.message ? e.message : "Could not sign in.";
      setLoginError(mapAuthPasswordError(raw));
    } finally {
      setLoginSaving(false);
    }
  }, [loginEmail, loginPassword]);

  const onSaveUsername = useCallback(async () => {
    setUsernameError(null);
    const v = validateUsernameInput(usernameDraft);
    if (v) {
      setUsernameError(v);
      return;
    }
    setUsernameSaving(true);
    try {
      await ensureSupabaseSession();
      await savePlayerUsernameOnce(usernameDraft.trim());
      const u = await fetchPlayerUsername();
      setUsername(u);
      setUsernameDraft(u ?? "");
      await flushPlayerProgressToServer();
    } catch (e) {
      const raw =
        e instanceof Error && e.message ? e.message : "Could not save username.";
      setUsernameError(mapUsernameRpcError(raw));
    } finally {
      setUsernameSaving(false);
    }
  }, [usernameDraft]);

  const powerupRows = useMemo<ProfileInvRow[]>(
    () => [
      {
        key: "str",
        emoji: "💪",
        title: "Strength",
        detail: `${shopInventory.strengthCharges}`,
        accent: "#7c2d12",
      },
      {
        key: "nb",
        emoji: "🪨",
        title: "No bounce",
        detail: `${shopInventory.noBounceCharges}`,
        accent: "#4c1d95",
      },
      {
        key: "nw",
        emoji: "💨",
        title: "No wind",
        detail: `${shopInventory.noWindCharges}`,
        accent: "#0e7490",
      },
    ],
    [shopInventory]
  );

  const hatRows = useMemo((): ProfileInvRow[] => {
    return shopInventory.ownedHats.map((hatId) => {
      const row = HAT_CATALOG.find((h) => h.id === hatId);
      return {
        key: `hat-${hatId}`,
        emoji: HAT_SHOP_EMOJI[hatId],
        title: row?.displayName ?? hatId,
        detail: "Owned",
      };
    });
  }, [shopInventory]);

  const vehicleRows = useMemo((): ProfileInvRow[] => {
    return VEHICLE_SHOP_CATALOG.filter((row) =>
      isVehicleUnlocked(stats, row.id, shopInventory.ownedVehicleIds)
    ).map((row) => {
      const owned = vehicleOwnedInShop(row.id, shopInventory);
      return {
        key: `veh-${row.id}`,
        vehicleId: row.id,
        emoji: vehicleShopEmoji(row.id),
        title: row.displayName,
        detail: owned ? "Owned" : "Unlocked",
      };
    });
  }, [shopInventory, stats]);

  const fishRows = useMemo((): ProfileInvRow[] => {
    return shopInventory.ownedFishIds.map((fishId) => {
      const row = FISH_SHOP_ITEMS.find((f) => f.id === fishId);
      return {
        key: `fish-${fishId}`,
        emoji: row?.emoji ?? "🐟",
        title: row?.label ?? fishId,
        detail: "Owned",
      };
    });
  }, [shopInventory]);

  const aquariumRows = useMemo((): ProfileInvRow[] => {
    return shopInventory.ownedAquariumIds.map((aqId) => {
      const row = AQUARIUM_SHOP_ITEMS.find((a) => a.id === aqId);
      return {
        key: `aq-${aqId}`,
        emoji: row?.emoji ?? "🧊",
        title: row?.label ?? aqId,
        detail: "Owned",
      };
    });
  }, [shopInventory]);

  const plazaBirdRows = useMemo((): ProfileInvRow[] => {
    return shopInventory.ownedPlazaBirdIds.map((birdId) => {
      const row = BIRD_SHOP_ITEMS.find((b) => b.id === birdId);
      return {
        key: `bird-${birdId}`,
        emoji: row?.emoji ?? "🐦",
        title: row?.label ?? birdId,
        detail: "Owned",
      };
    });
  }, [shopInventory]);

  if (!open) return null;

  const avgShots =
    stats.gamesWon > 0
      ? (stats.totalShotsLifetime / stats.gamesWon).toFixed(2)
      : "—";

  const last = stats.lastCompletedGame;
  const lastVehicleName =
    last &&
    PREDETERMINED_VEHICLES.find((v) => v.id === last.vehicleId)?.name;

  const subsectionHeaderStyle: CSSProperties = {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: hudColors.muted,
  };

  const statGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  };

  function statCard(
    emoji: string,
    label: string,
    value: string | number
  ) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderRadius: 12,
          border: "1px solid rgba(0, 114, 188, 0.16)",
          background: "rgba(255,255,255,0.72)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
      >
        <span
          style={{
            fontSize: 20,
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-hidden
        >
          {emoji}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: hudColors.muted,
              marginBottom: 2,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: hudColors.value,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.2,
            }}
          >
            {value}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-title"
      style={modalBackdrop}
      onClick={onClose}
    >
      <div
        style={{
          ...helpModalCard,
          maxWidth: 420,
          width: "min(92vw, 420px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <h2
            id="profile-title"
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.02em",
              color: hudColors.value,
            }}
          >
            Profile
          </h2>
          <span
            style={{
              ...hudFont,
              fontSize: 12,
              fontWeight: 700,
              color: hudColors.muted,
              background: "rgba(255,255,255,0.75)",
              borderRadius: 10,
              padding: "4px 10px",
              border: "1px solid rgba(0, 114, 188, 0.14)",
            }}
          >
            🪙{" "}
            <span style={{ color: "#b8860b", fontWeight: 800 }}>
              {stats.totalGoldCoins}
            </span>
          </span>
        </div>

        <section style={{ marginBottom: 14 }}>
          <h3
            style={{
              margin: "0 0 6px",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: hudColors.muted,
            }}
          >
            Username
          </h3>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 11,
              fontWeight: 600,
              color: hudColors.muted,
              lineHeight: 1.4,
            }}
          >
            Pick a unique name (letters, numbers, underscores). You can set it
            once — it can&apos;t be changed later.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <input
              type="text"
              autoComplete="username"
              spellCheck={false}
              disabled={
                !usernameFetchDone ||
                usernameSaving ||
                (username != null && username !== "")
              }
              value={usernameDraft}
              onChange={(e) => setUsernameDraft(e.target.value)}
              placeholder={
                !usernameFetchDone ? "Loading…" : "e.g. cool_shot_42"
              }
              style={inputStyle}
            />
            {username != null && username !== "" ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(0, 55, 95, 0.55)",
                  }}
                >
                  Locked — username cannot be changed.
                </p>
                {authNeedsEmailLink ? (
                  <>
                    {!pwSuccess && !pwFormOpen ? (
                      <button
                        type="button"
                        disabled={!usernameFetchDone}
                        onClick={() => {
                          setPwFormOpen(true);
                          setPwError(null);
                        }}
                        style={goldChipButtonStyle()}
                      >
                        Create password
                      </button>
                    ) : null}
                    {pwFormOpen && !pwSuccess ? (
                      <>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 10,
                            fontWeight: 600,
                            color: hudColors.muted,
                            lineHeight: 1.4,
                          }}
                        >
                          Add an email and password so you can sign in on another
                          device. Your password is stored only for sign-in (not in
                          our game database).
                        </p>
                        <input
                          type="email"
                          autoComplete="email"
                          spellCheck={false}
                          disabled={pwSaving || !usernameFetchDone}
                          value={pwEmail}
                          onChange={(e) => setPwEmail(e.target.value)}
                          placeholder="Email"
                          style={inputStyle}
                        />
                        <input
                          type="password"
                          autoComplete="new-password"
                          disabled={pwSaving || !usernameFetchDone}
                          value={pwPassword}
                          onChange={(e) => setPwPassword(e.target.value)}
                          placeholder="New password (min 6 characters)"
                          style={inputStyle}
                        />
                        <input
                          type="password"
                          autoComplete="new-password"
                          disabled={pwSaving || !usernameFetchDone}
                          value={pwConfirm}
                          onChange={(e) => setPwConfirm(e.target.value)}
                          placeholder="Confirm password"
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          disabled={
                            pwSaving ||
                            !usernameFetchDone ||
                            pwEmail.trim().length < 5 ||
                            pwPassword.length < 6
                          }
                          onClick={() => void onCreatePassword()}
                          style={goldChipButtonStyle()}
                        >
                          {pwSaving ? "Saving…" : "Save password"}
                        </button>
                      </>
                    ) : null}
                    {pwError ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#b42318",
                        }}
                      >
                        {pwError}
                      </p>
                    ) : null}
                    {pwSuccess ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#166534",
                          lineHeight: 1.4,
                        }}
                      >
                        {pwSuccess}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 600,
                      color: "rgba(0, 55, 95, 0.45)",
                      lineHeight: 1.4,
                    }}
                  >
                    Use your email and password to sign in on other devices.
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                disabled={
                  !usernameFetchDone ||
                  usernameSaving ||
                  usernameDraft.trim().length < 2
                }
                onClick={() => void onSaveUsername()}
                style={goldChipButtonStyle()}
              >
                {usernameSaving ? "Saving…" : "Save username"}
              </button>
            )}
            {usernameError ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#b42318",
                }}
              >
                {usernameError}
              </p>
            ) : null}
          </div>
        </section>

        <section style={{ marginBottom: 14 }}>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: hudColors.muted,
            }}
          >
            Inventory
          </h3>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 11,
              fontWeight: 600,
              color: hudColors.muted,
              lineHeight: 1.4,
            }}
          >
            Power-up charges on this device; other subsections list what you own
            or have unlocked. You can equip one hat, one fish, and one vehicle at
            a time.
          </p>

          <h4 style={{ ...subsectionHeaderStyle, margin: "0 0 8px" }}>
            Power-ups (this device)
          </h4>
          <ul style={invGridStyle}>
            {powerupRows.map((row) => (
              <li key={row.key} style={invCellStyle}>
                <span
                  style={{
                    fontSize: 26,
                    lineHeight: 1,
                    textAlign: "center",
                  }}
                  aria-hidden
                >
                  {row.emoji}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: hudColors.value,
                    textAlign: "center",
                    lineHeight: 1.25,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {row.title}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                    color: row.accent ?? hudColors.accent,
                    textAlign: "center",
                    marginTop: "auto",
                  }}
                >
                  {row.detail}
                </span>
              </li>
            ))}
          </ul>

          {hatRows.length > 0 ? (
            <>
              <h4 style={{ ...subsectionHeaderStyle, margin: "14px 0 8px" }}>
                Hats
              </h4>
              <ul style={invGridStyle}>
                {hatRows.map((row) => {
                  const hatId = row.key.slice("hat-".length) as HatId;
                  const equipped = shopInventory.equippedHatId === hatId;
                  return (
                    <li
                      key={row.key}
                      style={{
                        ...invCellStyle,
                        ...(equipped
                          ? {
                              border: "1px solid rgba(34, 197, 94, 0.45)",
                              boxShadow:
                                "0 0 10px rgba(34, 197, 94, 0.18), inset 0 1px 0 rgba(255,255,255,0.85)",
                              background:
                                "linear-gradient(180deg, rgba(220, 252, 231, 0.55) 0%, rgba(232, 246, 255, 0.75) 100%)",
                            }
                          : {}),
                      }}
                    >
                      <span
                        style={{
                          fontSize: 26,
                          lineHeight: 1,
                          textAlign: "center",
                        }}
                        aria-hidden
                      >
                        {row.emoji}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: hudColors.value,
                          textAlign: "center",
                          lineHeight: 1.25,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {row.title}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: hudColors.muted,
                          textAlign: "center",
                        }}
                      >
                        {row.detail}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          justifyContent: "center",
                          marginTop: "auto",
                          width: "100%",
                        }}
                      >
                        {equipped ? (
                          <button
                            type="button"
                            onClick={() => setEquippedHatId(null)}
                            style={goldChipButtonStyle()}
                          >
                            Unequip
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEquippedHatId(hatId)}
                            style={{
                              ...goldChipButtonStyle(),
                              boxShadow:
                                "inset 0 1px 0 rgba(255,255,255,0.55), 0 0 0 2px rgba(34, 197, 94, 0.65)",
                            }}
                          >
                            Equip
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          {vehicleRows.length > 0 ? (
            <>
              <h4 style={{ ...subsectionHeaderStyle, margin: "14px 0 8px" }}>
                Vehicles
              </h4>
              <ul style={invGridStyle}>
                {vehicleRows.map((row) => {
                  const vid = row.vehicleId ?? "";
                  const equipped = vehicleIdEq(currentVehicleId, vid);
                  return (
                    <li
                      key={row.key}
                      style={{
                        ...invCellStyle,
                        ...(equipped
                          ? {
                              border: "1px solid rgba(34, 197, 94, 0.45)",
                              boxShadow:
                                "0 0 10px rgba(34, 197, 94, 0.18), inset 0 1px 0 rgba(255,255,255,0.85)",
                              background:
                                "linear-gradient(180deg, rgba(220, 252, 231, 0.55) 0%, rgba(232, 246, 255, 0.75) 100%)",
                            }
                          : {}),
                      }}
                    >
                      <span
                        style={{
                          fontSize: 26,
                          lineHeight: 1,
                          textAlign: "center",
                        }}
                        aria-hidden
                      >
                        {row.emoji}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: hudColors.value,
                          textAlign: "center",
                          lineHeight: 1.25,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {row.title}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: hudColors.muted,
                          textAlign: "center",
                        }}
                      >
                        {row.detail}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          justifyContent: "center",
                          marginTop: "auto",
                          width: "100%",
                        }}
                      >
                        {equipped ? (
                          <button
                            type="button"
                            onClick={() => equipVehicleAndReload(DEFAULT_V_ID)}
                            style={goldChipButtonStyle()}
                          >
                            Unequip
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => equipVehicleAndReload(vid)}
                            style={{
                              ...goldChipButtonStyle(),
                              boxShadow:
                                "inset 0 1px 0 rgba(255,255,255,0.55), 0 0 0 2px rgba(34, 197, 94, 0.65)",
                            }}
                          >
                            Equip
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          {fishRows.length > 0 ? (
            <>
              <h4 style={{ ...subsectionHeaderStyle, margin: "14px 0 8px" }}>
                Fish
              </h4>
              <ul style={invGridStyle}>
                {fishRows.map((row) => {
                  const fishId = row.key.slice("fish-".length) as FishId;
                  const equipped = shopInventory.equippedFishId === fishId;
                  return (
                  <li
                    key={row.key}
                    style={{
                      ...invCellStyle,
                      ...(equipped
                        ? {
                            border: "1px solid rgba(34, 197, 94, 0.45)",
                            boxShadow:
                              "0 0 10px rgba(34, 197, 94, 0.18), inset 0 1px 0 rgba(255,255,255,0.85)",
                            background:
                              "linear-gradient(180deg, rgba(220, 252, 231, 0.55) 0%, rgba(232, 246, 255, 0.75) 100%)",
                          }
                        : {}),
                    }}
                  >
                    <span
                      style={{
                        fontSize: 26,
                        lineHeight: 1,
                        textAlign: "center",
                      }}
                      aria-hidden
                    >
                      {row.emoji}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: hudColors.value,
                        textAlign: "center",
                        lineHeight: 1.25,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {row.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: hudColors.muted,
                        textAlign: "center",
                      }}
                    >
                      {row.detail}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        justifyContent: "center",
                        marginTop: "auto",
                        width: "100%",
                      }}
                    >
                      {equipped ? (
                        <button
                          type="button"
                          onClick={() => setEquippedFishId(null)}
                          style={goldChipButtonStyle()}
                        >
                          Unequip
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEquippedFishId(fishId)}
                          style={{
                            ...goldChipButtonStyle(),
                            boxShadow:
                              "inset 0 1px 0 rgba(255,255,255,0.55), 0 0 0 2px rgba(34, 197, 94, 0.65)",
                          }}
                        >
                          Equip
                        </button>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          {plazaBirdRows.length > 0 ? (
            <>
              <h4 style={{ ...subsectionHeaderStyle, margin: "14px 0 8px" }}>
                Birds (plaza)
              </h4>
              <ul style={invGridStyle}>
                {plazaBirdRows.map((row) => (
                  <li key={row.key} style={invCellStyle}>
                    <span
                      style={{
                        fontSize: 26,
                        lineHeight: 1,
                        textAlign: "center",
                      }}
                      aria-hidden
                    >
                      {row.emoji}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: hudColors.value,
                        textAlign: "center",
                        lineHeight: 1.25,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {row.title}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        fontVariantNumeric: "tabular-nums",
                        color: row.accent ?? hudColors.accent,
                        textAlign: "center",
                        marginTop: "auto",
                      }}
                    >
                      {row.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {aquariumRows.length > 0 ? (
            <>
              <h4 style={{ ...subsectionHeaderStyle, margin: "14px 0 8px" }}>
                Aquariums
              </h4>
              <ul style={invGridStyle}>
                {aquariumRows.map((row) => (
                  <li key={row.key} style={invCellStyle}>
                    <span
                      style={{
                        fontSize: 26,
                        lineHeight: 1,
                        textAlign: "center",
                      }}
                      aria-hidden
                    >
                      {row.emoji}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: hudColors.value,
                        textAlign: "center",
                        lineHeight: 1.25,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {row.title}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        fontVariantNumeric: "tabular-nums",
                        color: row.accent ?? hudColors.accent,
                        textAlign: "center",
                        marginTop: "auto",
                      }}
                    >
                      {row.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section style={{ marginBottom: 14 }}>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: hudColors.muted,
            }}
          >
            Career
          </h3>
          <div style={statGridStyle}>
            {statCard("⛳", "Holes completed", stats.gamesWon)}
            {statCard("🎯", "Total shots", stats.totalShotsLifetime)}
            {statCard("📊", "Avg. shots / hole", avgShots)}
            {statCard("💪", "Strength used", stats.totalStrengthPowerupsUsed)}
            {statCard("🪨", "No-bounce used", stats.totalNoBouncePowerupsUsed)}
            {statCard("💧", "Water penalties", stats.totalWaterPenalties)}
          </div>
        </section>

        <section style={{ marginBottom: 4 }}>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: hudColors.muted,
            }}
          >
            Last completed battle
          </h3>
          {!last ? (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: hudColors.muted,
                lineHeight: 1.5,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px dashed rgba(0, 114, 188, 0.22)",
                background: "rgba(255,255,255,0.45)",
              }}
            >
              Finish a battle by hitting the goal to see your last round here.
            </p>
          ) : (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(0, 114, 188, 0.18)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(220, 244, 255, 0.5) 100%)",
              }}
            >
              <div style={statGridStyle}>
                {statCard(
                  "🚗",
                  "Vehicle",
                  lastVehicleName ?? last.vehicleId
                )}
                {statCard("🎯", "Shots", last.shots)}
                {statCard("💪", "Strength (hole)", last.strengthUses)}
                {statCard("🪨", "No-bounce (hole)", last.noBounceUses)}
                {statCard("💧", "Water (hole)", last.waterPenaltiesThisRound)}
              </div>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 10,
                  fontWeight: 600,
                  color: hudColors.muted,
                  textAlign: "center",
                }}
              >
                Saved {new Date(last.completedAt).toLocaleString()}
              </p>
            </div>
          )}
        </section>

        {usernameFetchDone && (username == null || username === "") ? (
          <section style={{ marginBottom: 14 }}>
            <h3
              style={{
                margin: "0 0 6px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: hudColors.muted,
              }}
            >
              Login
            </h3>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 11,
                fontWeight: 600,
                color: hudColors.muted,
                lineHeight: 1.4,
              }}
            >
              Already have an account with a username? Sign in with the email and
              password you set.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <input
                type="email"
                autoComplete="email"
                spellCheck={false}
                disabled={loginSaving}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Email"
                style={inputStyle}
              />
              <input
                type="password"
                autoComplete="current-password"
                disabled={loginSaving}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Password"
                style={inputStyle}
              />
              <button
                type="button"
                disabled={
                  loginSaving ||
                  loginEmail.trim().length < 5 ||
                  loginPassword.length < 1
                }
                onClick={() => void onProfileLogin()}
                style={goldChipButtonStyle()}
              >
                {loginSaving ? "Signing in…" : "Log in"}
              </button>
              {loginError ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#b42318",
                  }}
                >
                  {loginError}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          style={{
            ...goldPillButtonStyle({ disabled: false, fullWidth: true }),
            marginTop: 14,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
