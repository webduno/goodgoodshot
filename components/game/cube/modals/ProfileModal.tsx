"use client";

import { usePlayerStats } from "@/components/PlayerStatsProvider";
import {
  goldPillButtonStyle,
  helpModalCard,
  hudColors,
  modalBackdrop,
} from "@/components/gameHudStyles";
import { PREDETERMINED_VEHICLES } from "@/components/playerVehicleConfig";

export function ProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { stats } = usePlayerStats();

  if (!open) return null;

  const avgShots =
    stats.gamesWon > 0
      ? (stats.totalShotsLifetime / stats.gamesWon).toFixed(2)
      : "—";

  const last = stats.lastCompletedGame;
  const lastVehicleName =
    last &&
    PREDETERMINED_VEHICLES.find((v) => v.id === last.vehicleId)?.name;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-title"
      style={modalBackdrop}
      onClick={onClose}
    >
      <div
        style={helpModalCard}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="profile-title"
          style={{
            margin: "0 0 10px",
            fontSize: 16,
            fontWeight: 700,
            color: hudColors.value,
          }}
        >
          Profile
        </h2>

        <section style={{ marginBottom: 14 }}>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              fontWeight: 700,
              color: hudColors.value,
            }}
          >
            Career
          </h3>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              color: hudColors.label,
              fontSize: 12,
              lineHeight: 1.6,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <li>Holes completed: {stats.gamesWon}</li>
            <li>Total shots (completed holes): {stats.totalShotsLifetime}</li>
            <li>Average shots per hole: {avgShots}</li>
            <li>Strength power-ups used (lifetime): {stats.totalStrengthPowerupsUsed}</li>
            <li>No-bounce power-ups used (lifetime): {stats.totalNoBouncePowerupsUsed}</li>
            <li>Water penalties (lifetime): {stats.totalWaterPenalties}</li>
          </ul>
        </section>

        <section>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              fontWeight: 700,
              color: hudColors.value,
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
              }}
            >
              Finish a hole by hitting the goal to record a round here.
            </p>
          ) : (
            <div
              style={{
                fontSize: 12,
                color: hudColors.label,
                lineHeight: 1.55,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <p style={{ margin: "0 0 6px" }}>
                Vehicle:{" "}
                <strong style={{ color: hudColors.value }}>
                  {lastVehicleName ?? last.vehicleId}
                </strong>
              </p>
              <p style={{ margin: "0 0 6px" }}>Shots: {last.shots}</p>
              <p style={{ margin: "0 0 6px" }}>
                Goal center: X {last.goalWorldX}, Z {last.goalWorldZ}
              </p>
              <p style={{ margin: "0 0 6px" }}>
                Power-ups this hole — strength: {last.strengthUses}, no bounce:{" "}
                {last.noBounceUses}
              </p>
              <p style={{ margin: "0 0 8px" }}>
                Water penalties this hole: {last.waterPenaltiesThisRound}
              </p>
              <p
                style={{
                  margin: "0 0 4px",
                  fontWeight: 700,
                  color: hudColors.value,
                }}
              >
                Water hazards (pond centers and half-extents)
              </p>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                }}
              >
                {last.ponds.length === 0 ? (
                  <li style={{ color: hudColors.muted }}>None on that layout.</li>
                ) : (
                  last.ponds.map((p, i) => (
                    <li key={`${p.worldX}-${p.worldZ}-${i}`}>
                      Pond {i + 1}: center ({p.worldX}, {p.worldZ}) — half size{" "}
                      {p.halfX} × {p.halfZ}
                    </li>
                  ))
                )}
              </ul>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 10,
                  color: hudColors.muted,
                }}
              >
                Saved: {new Date(last.completedAt).toLocaleString()}
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
