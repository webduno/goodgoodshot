"use client";

import {
  goldChipButtonStyle,
  helpModalCard,
  hudColors,
  hudFont,
  modalBackdrop,
} from "@/components/gameHudStyles";
import { HAT_CATALOG } from "@/lib/shop/hatCatalog";
import type { HatId } from "@/lib/shop/playerInventory";
import { VEHICLE_SHOP_CATALOG } from "@/lib/shop/vehicleCatalog";
import { formatMsAsMmSs } from "@/lib/shop/freeShopClaims";
import type { PowerupSlotId } from "@/lib/game/types";
import { useCallback, useState, type CSSProperties } from "react";

type ShopTab = "powerups" | "hats" | "vehicles" | "free";

const SHOP_CATEGORY_TABS: { id: ShopTab; label: string }[] = [
  { id: "powerups", label: "Power-ups" },
  { id: "hats", label: "Hats" },
  { id: "vehicles", label: "Vehicles" },
  { id: "free", label: "Free" },
];

const shopTabBarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  padding: 4,
  borderRadius: 14,
  background: "linear-gradient(180deg, rgba(0, 72, 120, 0.07) 0%, rgba(0, 55, 95, 0.1) 100%)",
  border: "1px solid rgba(0, 114, 188, 0.14)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
};

function shopCategoryTabStyle(active: boolean): CSSProperties {
  return {
    ...hudFont,
    flex: 1,
    minWidth: 72,
    padding: "0.55rem 0.4rem",
    fontSize: 11,
    fontWeight: active ? 800 : 600,
    letterSpacing: "0.03em",
    borderRadius: 10,
    border: active
      ? "1px solid rgba(0, 114, 188, 0.22)"
      : "1px solid transparent",
    color: active ? hudColors.value : hudColors.muted,
    background: active
      ? "linear-gradient(180deg, #ffffff 0%, rgba(232, 246, 255, 0.94) 100%)"
      : "transparent",
    boxShadow: active
      ? "0 2px 6px rgba(0, 55, 95, 0.12), inset 0 1px 0 rgba(255,255,255,0.95)"
      : "none",
    cursor: "pointer",
    transition: "color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
  };
}

const SHOP_GRID_SLOTS = 9;

const shopItemEmojiStyle: CSSProperties = {
  fontSize: 28,
  lineHeight: 1,
  textAlign: "center",
  display: "block",
};

const LOCKED_SLOT_EMOJI = "🔒";

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

const shopGridStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
};

function lockedShopCellStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 96,
    padding: "10px 8px",
    borderRadius: 12,
    border: "1px dashed rgba(0, 55, 95, 0.22)",
    background: "rgba(0, 55, 95, 0.06)",
    boxSizing: "border-box",
  };
}

export function ShopModal({
  open,
  onClose,
  goldCoins,
  strengthCharges,
  noBounceCharges,
  noWindCharges,
  ownedHats,
  equippedHatId,
  onBuyPowerupSlot,
  onBuyHat,
  onEquipHat,
  ownedVehicleIds,
  onBuyVehicle,
  isVehicleUnlockedForPlayer,
  canClaimFreeCoinBag,
  freeCoinBagRemainingMs,
  onClaimFreeCoinBag,
  onOpenProfile,
}: {
  open: boolean;
  onClose: () => void;
  /** Opens profile / inventory; shop should close in the parent handler. */
  onOpenProfile: () => void;
  goldCoins: number;
  strengthCharges: number;
  noBounceCharges: number;
  noWindCharges: number;
  ownedHats: readonly HatId[];
  equippedHatId: HatId | null;
  onBuyPowerupSlot: (slotId: Extract<PowerupSlotId, "strength" | "noBounce" | "nowind">) => void;
  onBuyHat: (id: HatId) => void;
  onEquipHat: (id: HatId | null) => void;
  ownedVehicleIds: readonly string[];
  onBuyVehicle: (vehicleId: string) => void;
  /** True when the player can use the vehicle (shop purchase, Ratata beta, or battle unlock). */
  isVehicleUnlockedForPlayer: (vehicleId: string) => boolean;
  canClaimFreeCoinBag: boolean;
  freeCoinBagRemainingMs: number;
  onClaimFreeCoinBag: () => void;
}) {
  const [tab, setTab] = useState<ShopTab>("powerups");

  const resetTab = useCallback(() => setTab("powerups"), []);

  if (!open) return null;

  const hatOwned = (id: HatId) => ownedHats.includes(id);
  const vehicleOwned = (id: string) =>
    ownedVehicleIds.includes(id.trim().toLowerCase());

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-title"
      style={modalBackdrop}
      onClick={() => {
        resetTab();
        onClose();
      }}
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
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <h2
            id="shop-title"
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: hudColors.value,
              letterSpacing: "0.02em",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "8px 16px",
            }}
          >
            Shop
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: hudColors.muted,
                background: "#eeeeee",
                borderRadius: 10,
                padding: "4px 8px",
              }}
            >
              {/* single coin emoji */}
              🪙 Coins:{" "}
              <span style={{ color: hudColors.accent, fontWeight: 800 }}>
                {goldCoins}
              </span>
            </span>
          </h2>
          <button
            type="button"
            aria-label="Open profile"
            onClick={() => {
              resetTab();
              onOpenProfile();
            }}
            style={goldChipButtonStyle()}
          >
            Profile
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Shop categories"
          style={{
            ...shopTabBarStyle,
            marginBottom: 12,
          }}
        >
          {SHOP_CATEGORY_TABS.map(({ id, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                id={`shop-tab-${id}`}
                onClick={() => setTab(id)}
                style={shopCategoryTabStyle(active)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {tab === "powerups" && (
          <ul style={shopGridStyle}>
            <li
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "space-between",
                gap: 8,
                minHeight: 96,
                padding: "8px 8px",
                borderRadius: 12,
                border: "1px solid rgba(0, 55, 95, 0.18)",
                background: "rgba(255,255,255,0.55)",
                boxSizing: "border-box",
              }}
            >
              <span style={shopItemEmojiStyle} aria-hidden>
                💪
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#7c2d12",
                  lineHeight: 1.25,
                  textAlign: "center",
                }}
              >
                Strength (+1)
              </span>
              <button
                type="button"
                onClick={() => onBuyPowerupSlot("strength")}
                style={{ ...goldChipButtonStyle(), width: "100%", marginTop: "auto" }}
              >
                1 coin
              </button>
            </li>
            <li
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "space-between",
                gap: 8,
                minHeight: 96,
                padding: "8px 8px",
                borderRadius: 12,
                border: "1px solid rgba(0, 55, 95, 0.18)",
                background: "rgba(255,255,255,0.55)",
                boxSizing: "border-box",
              }}
            >
              <span style={shopItemEmojiStyle} aria-hidden>
                🪨
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#4c1d95",
                  lineHeight: 1.25,
                  textAlign: "center",
                }}
              >
                No bounce (+1)
              </span>
              <button
                type="button"
                onClick={() => onBuyPowerupSlot("noBounce")}
                style={{ ...goldChipButtonStyle(), width: "100%", marginTop: "auto" }}
              >
                1 coin
              </button>
            </li>
            <li
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "space-between",
                gap: 8,
                minHeight: 96,
                padding: "8px 8px",
                borderRadius: 12,
                border: "1px solid rgba(0, 55, 95, 0.18)",
                background: "rgba(255,255,255,0.55)",
                boxSizing: "border-box",
              }}
            >
              <span style={shopItemEmojiStyle} aria-hidden>
                💨
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#0e7490",
                  lineHeight: 1.25,
                  textAlign: "center",
                }}
              >
                No wind (+1)
              </span>
              <button
                type="button"
                onClick={() => onBuyPowerupSlot("nowind")}
                style={{ ...goldChipButtonStyle(), width: "100%", marginTop: "auto" }}
              >
                1 coin
              </button>
            </li>
            {Array.from(
              { length: SHOP_GRID_SLOTS - 3 },
              (_, i) => (
                <li
                  key={`powerup-locked-${i}`}
                  aria-hidden
                  style={lockedShopCellStyle()}
                >
                  <span style={shopItemEmojiStyle}>{LOCKED_SLOT_EMOJI}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: hudColors.muted,
                      letterSpacing: "0.04em",
                    }}
                  >
                    Locked
                  </span>
                </li>
              ),
            )}
          </ul>
        )}

        {tab === "hats" && (
          <ul style={shopGridStyle}>
            {HAT_CATALOG.map((row) => {
              const owned = hatOwned(row.id);
              const equipped = equippedHatId === row.id;
              return (
                <li
                  key={row.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 6,
                    minHeight: 96,
                    padding: "8px 8px",
                    borderRadius: 12,
                    border: "1px solid rgba(0, 55, 95, 0.18)",
                    background: "rgba(255,255,255,0.55)",
                    boxSizing: "border-box",
                  }}
                >
                  <span style={shopItemEmojiStyle} aria-hidden>
                    {HAT_SHOP_EMOJI[row.id]}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: hudColors.value,
                      lineHeight: 1.25,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textAlign: "center",
                    }}
                  >
                    {row.displayName}
                  </span>
                  {!owned ? (
                    <button
                      type="button"
                      onClick={() => onBuyHat(row.id)}
                      style={{ ...goldChipButtonStyle(), width: "100%", marginTop: "auto" }}
                    >
                      {row.priceCoins} coin
                    </button>
                  ) : (
                    <>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: hudColors.muted,
                          textAlign: "center",
                        }}
                      >
                        Owned
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          justifyContent: "center",
                          marginTop: "auto",
                        }}
                      >
                        {equipped ? (
                          <button
                            type="button"
                            onClick={() => onEquipHat(null)}
                            style={goldChipButtonStyle()}
                          >
                            Unequip
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onEquipHat(row.id)}
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
                    </>
                  )}
                </li>
              );
            })}
            {Array.from(
              { length: SHOP_GRID_SLOTS - HAT_CATALOG.length },
              (_, i) => (
                <li
                  key={`hat-locked-${i}`}
                  aria-hidden
                  style={lockedShopCellStyle()}
                >
                  <span style={shopItemEmojiStyle}>{LOCKED_SLOT_EMOJI}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: hudColors.muted,
                      letterSpacing: "0.04em",
                    }}
                  >
                    Locked
                  </span>
                </li>
              ),
            )}
          </ul>
        )}

        {tab === "vehicles" && (
          <ul style={shopGridStyle}>
            {VEHICLE_SHOP_CATALOG.map((row) => {
              const purchased = vehicleOwned(row.id);
              const playable = isVehicleUnlockedForPlayer(row.id);
              return (
                <li
                  key={row.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 6,
                    minHeight: 96,
                    padding: "8px 8px",
                    borderRadius: 12,
                    border: "1px solid rgba(0, 55, 95, 0.18)",
                    background: "rgba(255,255,255,0.55)",
                    boxSizing: "border-box",
                  }}
                >
                  <span style={shopItemEmojiStyle} aria-hidden>
                    {vehicleShopEmoji(row.id)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: hudColors.value,
                      lineHeight: 1.25,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textAlign: "center",
                    }}
                  >
                    {row.displayName}
                  </span>
                  {purchased ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: hudColors.muted,
                        textAlign: "center",
                        marginTop: "auto",
                      }}
                    >
                      Owned — select in war / help
                    </span>
                  ) : playable ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: hudColors.muted,
                        textAlign: "center",
                        marginTop: "auto",
                      }}
                    >
                      Unlocked
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onBuyVehicle(row.id)}
                      style={{ ...goldChipButtonStyle(), width: "100%", marginTop: "auto" }}
                    >
                      {row.priceCoins} coins
                    </button>
                  )}
                </li>
              );
            })}
            {Array.from(
              { length: SHOP_GRID_SLOTS - VEHICLE_SHOP_CATALOG.length },
              (_, i) => (
                <li
                  key={`vehicle-locked-${i}`}
                  aria-hidden
                  style={lockedShopCellStyle()}
                >
                  <span style={shopItemEmojiStyle}>{LOCKED_SLOT_EMOJI}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: hudColors.muted,
                      letterSpacing: "0.04em",
                    }}
                  >
                    Locked
                  </span>
                </li>
              ),
            )}
          </ul>
        )}

        {tab === "free" && (
          <ul style={shopGridStyle}>
            <li
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "space-between",
                gap: 8,
                minHeight: 96,
                padding: "8px 8px",
                borderRadius: 12,
                border: "1px solid rgba(0, 55, 95, 0.18)",
                background: "rgba(255,255,255,0.55)",
                boxSizing: "border-box",
              }}
            >
              <span style={shopItemEmojiStyle} aria-hidden>
                🎁
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#7c2d12",
                  lineHeight: 1.25,
                  textAlign: "center",
                }}
              >
                3 coin bag
              </span>
              {canClaimFreeCoinBag ? (
                <button
                  type="button"
                  onClick={onClaimFreeCoinBag}
                  style={{ ...goldChipButtonStyle(), width: "100%", marginTop: "auto" }}
                >
                  Claim
                </button>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: hudColors.muted,
                    textAlign: "center",
                    marginTop: "auto",
                  }}
                >
                  Next in {formatMsAsMmSs(freeCoinBagRemainingMs)}
                </span>
              )}
            </li>
            {Array.from(
              { length: SHOP_GRID_SLOTS - 1 },
              (_, i) => (
                <li
                  key={`free-locked-${i}`}
                  aria-hidden
                  style={lockedShopCellStyle()}
                >
                  <span style={shopItemEmojiStyle}>{LOCKED_SLOT_EMOJI}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: hudColors.muted,
                      letterSpacing: "0.04em",
                    }}
                  >
                    Locked
                  </span>
                </li>
              ),
            )}
          </ul>
        )}

        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => {
              resetTab();
              onClose();
            }}
            style={goldChipButtonStyle()}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
