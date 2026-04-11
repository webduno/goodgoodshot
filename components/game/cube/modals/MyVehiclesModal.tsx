"use client";

import { usePlayerStats } from "@/components/PlayerStatsProvider";
import { usePlayerShopInventory } from "@/lib/shop/usePlayerShopInventory";
import {
  DEFAULT_V_ID,
  PREDETERMINED_VEHICLES,
  rgbTupleToCss,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";
import {
  goldChipButtonStyle,
  hudColors,
  helpModalCard,
  modalBackdrop,
} from "@/components/gameHudStyles";
import { writePreferredVehicleId } from "@/lib/game/preferredVehicleStorage";
import {
  isVehicleUnlocked,
  PREMIUM_RATATA_VEHICLE_ID,
  shouldShowRatataBetaTag,
} from "@/lib/game/vehicleUnlock";

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

export function MyVehiclesModal({
  open,
  onClose,
  currentVehicle,
}: {
  open: boolean;
  onClose: () => void;
  currentVehicle: PlayerVehicleConfig;
}) {
  const { stats } = usePlayerStats();
  const { inventory: shopInventory } = usePlayerShopInventory();

  if (!open) return null;

  const myVehicles = PREDETERMINED_VEHICLES.filter((v) =>
    isVehicleUnlocked(stats, v.id, shopInventory.ownedVehicleIds)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-vehicles-title"
      style={modalBackdrop}
      onClick={onClose}
    >
      <div
        style={{
          ...helpModalCard,
          maxWidth: 400,
          width: "min(94vw, 400px)",
          maxHeight: "min(80vh, 480px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <h2
            id="my-vehicles-title"
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#001a2e",
              textShadow:
                "0 1px 0 rgba(255,255,255,0.85), 0 3px 0 rgba(0, 80, 130, 0.12)",
            }}
          >
            My vehicles
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              ...goldChipButtonStyle(),
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 800,
              padding: "6px 12px",
            }}
          >
            Close
          </button>
        </div>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            lineHeight: 1.45,
            color: hudColors.label,
          }}
        >
          Choose a vehicle you have unlocked. The page reloads with your
          selection equipped.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {myVehicles.map((v) => {
            const isCurrent = v.id === currentVehicle.id;
            const betaTag =
              shouldShowRatataBetaTag() && v.id === PREMIUM_RATATA_VEHICLE_ID;
            const mainCss = rgbTupleToCss(v.mainRgb);
            const accentCss = rgbTupleToCss(v.accentRgb);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  equipVehicleAndReload(v.id);
                }}
                title={`Equip ${v.name} and reload`}
                style={{
                  ...goldChipButtonStyle(),
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "6px 12px",
                  backgroundImage: `linear-gradient(135deg, ${mainCss} 0%, ${accentCss} 100%)`,
                  border: "1px solid rgba(255,255,255,0.88)",
                  color: "#ffffff",
                  textShadow: "0 1px 2px rgba(0,0,0,0.55)",
                  cursor: "pointer",
                  ...(isCurrent
                    ? {
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), 0 3px 12px rgba(0,0,0,0.28), 0 0 0 2px ${accentCss}, 0 0 14px ${accentCss}`,
                      }
                    : {
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.35), 0 3px 10px rgba(0,0,0,0.22)",
                      }),
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    flexWrap: "wrap",
                  }}
                >
                  {v.name}
                  {betaTag ? (
                    <span
                      style={{
                        fontSize: 7,
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "1px 5px",
                        borderRadius: 4,
                        background:
                          "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                        border: "1px solid rgba(255,255,255,0.55)",
                      }}
                    >
                      Beta
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <p
          style={{
            margin: "14px 0 0",
            fontSize: 11,
            lineHeight: 1.45,
            color: hudColors.muted,
          }}
        >
          Need more hulls? Open{" "}
          <strong style={{ color: hudColors.value }}>Menu</strong> →{" "}
          <strong style={{ color: hudColors.value }}>Plaza shop</strong>.
        </p>
      </div>
    </div>
  );
}
