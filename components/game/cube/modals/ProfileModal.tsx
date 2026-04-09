"use client";

import { useMemo, type CSSProperties } from "react";

import { usePlayerStats } from "@/components/PlayerStatsProvider";
import { PREDETERMINED_VEHICLES } from "@/components/playerVehicleConfig";
import {
  goldPillButtonStyle,
  helpModalCard,
  hudColors,
  hudFont,
  modalBackdrop,
} from "@/components/gameHudStyles";
import { isVehicleUnlocked } from "@/lib/game/vehicleUnlock";
import { FISH_SHOP_ITEMS, AQUARIUM_SHOP_ITEMS } from "@/lib/shop/aquariumCatalog";
import { HAT_CATALOG } from "@/lib/shop/hatCatalog";
import type { HatId, PlayerShopInventory } from "@/lib/shop/playerInventory";
import { usePlayerShopInventory } from "@/lib/shop/usePlayerShopInventory";
import { VEHICLE_SHOP_CATALOG } from "@/lib/shop/vehicleCatalog";

const HAT_SHOP_EMOJI: Record<HatId, string> = {
  glassPyramid: "🔺",
  glassCube: "📦",
  glassSphere: "🔮",
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

type ProfileInvRow = {
  key: string;
  emoji: string;
  title: string;
  detail: string;
  accent?: string;
  locked?: boolean;
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

function invCellStyleBase(locked: boolean): CSSProperties {
  if (locked) {
    return {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: 4,
      minHeight: 88,
      padding: "8px 6px",
      borderRadius: 12,
      border: "1px dashed rgba(0, 55, 95, 0.22)",
      background: "rgba(0, 55, 95, 0.06)",
      boxSizing: "border-box",
    };
  }
  return {
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
}

export function ProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { stats } = usePlayerStats();
  const { inventory: shopInventory } = usePlayerShopInventory();

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
    return HAT_CATALOG.map((row) => {
      const owned = shopInventory.ownedHats.includes(row.id);
      if (!owned) {
        return {
          key: `hat-${row.id}`,
          emoji: HAT_SHOP_EMOJI[row.id],
          title: row.displayName,
          detail: "Locked",
          locked: true,
        };
      }
      const equipped = shopInventory.equippedHatId === row.id;
      return {
        key: `hat-${row.id}`,
        emoji: HAT_SHOP_EMOJI[row.id],
        title: row.displayName,
        detail: equipped ? "Equipped" : "Owned",
      };
    });
  }, [shopInventory]);

  const vehicleRows = useMemo((): ProfileInvRow[] => {
    return VEHICLE_SHOP_CATALOG.map((row) => {
      const owned = vehicleOwnedInShop(row.id, shopInventory);
      const unlocked = isVehicleUnlocked(
        stats,
        row.id,
        shopInventory.ownedVehicleIds
      );
      if (!unlocked) {
        return {
          key: `veh-${row.id}`,
          emoji: vehicleShopEmoji(row.id),
          title: row.displayName,
          detail: "Locked",
          locked: true,
        };
      }
      return {
        key: `veh-${row.id}`,
        emoji: vehicleShopEmoji(row.id),
        title: row.displayName,
        detail: owned ? "Owned" : "Unlocked",
      };
    });
  }, [shopInventory, stats]);

  const fishRows = useMemo((): ProfileInvRow[] => {
    return FISH_SHOP_ITEMS.map((row) => {
      const owned = shopInventory.ownedFishIds.includes(row.id);
      if (!owned) {
        return {
          key: `fish-${row.id}`,
          emoji: row.emoji,
          title: row.label,
          detail: "Locked",
          locked: true,
        };
      }
      return {
        key: `fish-${row.id}`,
        emoji: row.emoji,
        title: row.label,
        detail: "Owned",
      };
    });
  }, [shopInventory]);

  const aquariumRows = useMemo((): ProfileInvRow[] => {
    return AQUARIUM_SHOP_ITEMS.map((row) => {
      const owned = shopInventory.ownedAquariumIds.includes(row.id);
      if (!owned) {
        return {
          key: `aq-${row.id}`,
          emoji: row.emoji,
          title: row.label,
          detail: "Locked",
          locked: true,
        };
      }
      return {
        key: `aq-${row.id}`,
        emoji: row.emoji,
        title: row.label,
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
            Coins, power-up charges on this device, and everything in the shop
            catalogs — owned items are highlighted; locked slots show what you can
            still unlock or buy in the plaza.
          </p>

          <h4 style={{ ...subsectionHeaderStyle, margin: "0 0 8px" }}>
            Power-ups (this device)
          </h4>
          <ul style={invGridStyle}>
            {powerupRows.map((row) => (
              <li key={row.key} style={invCellStyleBase(false)}>
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

          <h4 style={{ ...subsectionHeaderStyle, margin: "14px 0 8px" }}>Hats</h4>
          <ul style={invGridStyle}>
            {hatRows.map((row) => (
              <li key={row.key} style={invCellStyleBase(!!row.locked)}>
                <span
                  style={{
                    fontSize: 26,
                    lineHeight: 1,
                    textAlign: "center",
                    opacity: row.locked ? 0.45 : 1,
                  }}
                  aria-hidden
                >
                  {row.emoji}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: row.locked ? hudColors.muted : hudColors.value,
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
                    color: row.locked
                      ? hudColors.muted
                      : row.accent ?? hudColors.accent,
                    textAlign: "center",
                    marginTop: "auto",
                  }}
                >
                  {row.detail}
                </span>
              </li>
            ))}
          </ul>

          <h4 style={{ ...subsectionHeaderStyle, margin: "14px 0 8px" }}>
            Vehicles
          </h4>
          <ul style={invGridStyle}>
            {vehicleRows.map((row) => (
              <li key={row.key} style={invCellStyleBase(!!row.locked)}>
                <span
                  style={{
                    fontSize: 26,
                    lineHeight: 1,
                    textAlign: "center",
                    opacity: row.locked ? 0.45 : 1,
                  }}
                  aria-hidden
                >
                  {row.emoji}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: row.locked ? hudColors.muted : hudColors.value,
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
                    color: row.locked
                      ? hudColors.muted
                      : row.accent ?? hudColors.accent,
                    textAlign: "center",
                    marginTop: "auto",
                  }}
                >
                  {row.detail}
                </span>
              </li>
            ))}
          </ul>

          <h4 style={{ ...subsectionHeaderStyle, margin: "14px 0 8px" }}>Fish</h4>
          <ul style={invGridStyle}>
            {fishRows.map((row) => (
              <li key={row.key} style={invCellStyleBase(!!row.locked)}>
                <span
                  style={{
                    fontSize: 26,
                    lineHeight: 1,
                    textAlign: "center",
                    opacity: row.locked ? 0.45 : 1,
                  }}
                  aria-hidden
                >
                  {row.emoji}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: row.locked ? hudColors.muted : hudColors.value,
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
                    color: row.locked
                      ? hudColors.muted
                      : row.accent ?? hudColors.accent,
                    textAlign: "center",
                    marginTop: "auto",
                  }}
                >
                  {row.detail}
                </span>
              </li>
            ))}
          </ul>

          <h4 style={{ ...subsectionHeaderStyle, margin: "14px 0 8px" }}>
            Aquariums
          </h4>
          <ul style={invGridStyle}>
            {aquariumRows.map((row) => (
              <li key={row.key} style={invCellStyleBase(!!row.locked)}>
                <span
                  style={{
                    fontSize: 26,
                    lineHeight: 1,
                    textAlign: "center",
                    opacity: row.locked ? 0.45 : 1,
                  }}
                  aria-hidden
                >
                  {row.emoji}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: row.locked ? hudColors.muted : hudColors.value,
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
                    color: row.locked
                      ? hudColors.muted
                      : row.accent ?? hudColors.accent,
                    textAlign: "center",
                    marginTop: "auto",
                  }}
                >
                  {row.detail}
                </span>
              </li>
            ))}
          </ul>
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
            Last completed hole
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
              Finish a hole by hitting the goal to see your last round here.
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
