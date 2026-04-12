"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { usePlayerStats } from "@/components/PlayerStatsProvider";
import { usePlayerShopInventory } from "@/lib/shop/usePlayerShopInventory";
import {
  goldChipButtonStyle,
  helpModalCard,
  hudColors,
  hudFont,
  modalBackdrop,
} from "@/components/gameHudStyles";
import { BiomeChoiceBadgeList } from "@/components/game/cube/modals/BiomeChoiceBadgeList";
import {
  PREDETERMINED_VEHICLES,
  rgbTupleToCss,
  vehicleIdForQueryString,
} from "@/components/playerVehicleConfig";
import { isVehicleUnlocked } from "@/lib/game/vehicleUnlock";
import { useResolvedPlayerVehicle } from "@/lib/game/useResolvedPlayerVehicle";
import type { SessionBattleCount } from "@/lib/game/playSession";
import type { SessionBiomeChoice } from "@/lib/game/sessionBattleMaps";
import { startWarSessionAndRedirectHome } from "@/lib/game/startWarSession";

export function PlazaWarPortalModal({
  open,
  battleCount,
  onClose,
}: {
  open: boolean;
  battleCount: SessionBattleCount;
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { stats } = usePlayerStats();
  const { inventory: shopInventory } = usePlayerShopInventory();
  const [biomeChoice, setBiomeChoice] =
    useState<SessionBiomeChoice>("random");

  const setVehicleInUrl = useCallback(
    (vehicleId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!vehicleId || vehicleId.toLowerCase() === "default") {
        params.delete("vehicle");
      } else {
        params.set("vehicle", vehicleId);
      }
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const { playerVehicle: selectedVehicle } = useResolvedPlayerVehicle(
    searchParams.get("vehicle"),
    stats,
    shopInventory.ownedVehicleIds
  );

  const vehiclesYouCanUse = useMemo(
    () =>
      PREDETERMINED_VEHICLES.filter((v) =>
        isVehicleUnlocked(stats, v.id, shopInventory.ownedVehicleIds)
      ),
    [stats, shopInventory.ownedVehicleIds]
  );

  useEffect(() => {
    if (!open) return;
    setBiomeChoice("random");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onStartWar = useCallback(() => {
    startWarSessionAndRedirectHome(battleCount, biomeChoice, {
      vehicleParam: vehicleIdForQueryString(selectedVehicle),
    });
  }, [battleCount, biomeChoice, selectedVehicle]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plaza-war-portal-title"
      style={modalBackdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          ...helpModalCard,
          maxWidth: 440,
          width: "min(94vw, 440px)",
          maxHeight: "min(86vh, 620px)",
          display: "flex",
          flexDirection: "column",
          textAlign: "left",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2
          id="plaza-war-portal-title"
          style={{
            ...hudFont,
            margin: "0 0 8px",
            fontSize: 18,
            fontWeight: 800,
            color: hudColors.label,
            lineHeight: 1.2,
            flexShrink: 0,
          }}
        >
          {battleCount} Battle War
        </h2>
        <p
          style={{
            ...hudFont,
            margin: "0 0 14px",
            fontSize: 12,
            color: "rgba(0, 55, 95, 0.72)",
            lineHeight: 1.35,
            flexShrink: 0,
          }}
        >
          Choose fairway style and your vehicle, then start the single-player
          war on the home course.
        </p>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: hudColors.muted,
            }}
          >
            Biome
          </p>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 12.5,
              lineHeight: 1.5,
              color: hudColors.label,
            }}
          >
            Random picks a biome per battle; a fixed choice uses that biome for
            every battle.
          </p>
          <BiomeChoiceBadgeList
            value={biomeChoice}
            onChange={setBiomeChoice}
            labelMode="newSession"
          />
          <p
            style={{
              margin: "18px 0 8px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: hudColors.muted,
            }}
          >
            Vehicle
          </p>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 12.5,
              lineHeight: 1.5,
              color: hudColors.label,
            }}
          >
            Pick a vehicle for this war — only vehicles you have access to are
            listed.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {vehiclesYouCanUse.map((v) => {
              const selected = selectedVehicle.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicleInUrl(v.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: selected
                      ? "2px solid #0072bc"
                      : "1px solid rgba(0, 114, 188, 0.18)",
                    background: selected
                      ? "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(210, 240, 255, 0.55) 100%)"
                      : "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(230, 248, 255, 0.35) 100%)",
                    cursor: "pointer",
                    textAlign: "left",
                    ...hudFont,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      gap: 4,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 4,
                        border: "1px solid rgba(0,0,0,0.12)",
                        backgroundColor: rgbTupleToCss(v.mainRgb),
                      }}
                    />
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 4,
                        border: "1px solid rgba(0,0,0,0.12)",
                        backgroundColor: rgbTupleToCss(v.accentRgb),
                      }}
                    />
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: hudColors.value,
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {v.name}
                  </span>
                  {selected ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: hudColors.accent,
                      }}
                      aria-hidden
                    >
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 16,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onStartWar}
            style={{
              ...goldChipButtonStyle(),
              width: "100%",
              padding: "10px 14px",
              fontSize: 13,
            }}
          >
            Start war
          </button>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...goldChipButtonStyle(),
                padding: "6px 14px",
                fontSize: 11,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
