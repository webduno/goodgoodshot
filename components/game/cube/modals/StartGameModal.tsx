"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  goldPillButtonStyle,
  hudColors,
  hudFont,
  hudMiniPanel,
  modalBackdrop,
  POWERUP_SLOT_ACCENT,
} from "@/components/gameHudStyles";
import {
  PREDETERMINED_VEHICLES,
  rgbTupleToCss,
  resolveVehicleFromUrlParam,
} from "@/components/playerVehicleConfig";
import { INITIAL_POWERUP_CHARGES } from "@/lib/game/constants";
import { burstVehicleStartConfetti } from "@/lib/game/confetti";
import {
  formatSessionScoreHud,
  type PlaySession,
  type SessionBattleCount,
} from "@/lib/game/playSession";

const BATTLE_OPTIONS: SessionBattleCount[] = [3, 9, 18];

const startModalShell: CSSProperties = {
  ...hudFont,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  maxWidth: 352,
  width: "min(92vw, 352px)",
  padding: "20px 18px 18px",
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.92)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.65), 0 22px 56px rgba(0, 55, 100, 0.32), 0 0 0 1px rgba(0, 174, 239, 0.12)",
  textAlign: "left",
  backgroundImage: [
    "radial-gradient(ellipse 130% 90% at 50% -15%, rgba(255,255,255,0.98) 0%, transparent 52%)",
    "linear-gradient(168deg, rgba(255,255,255,0.96) 0%, rgba(215, 244, 255, 0.9) 42%, rgba(170, 228, 255, 0.85) 100%)",
  ].join(", "),
};

const rulesPanel: CSSProperties = {
  margin: "0 0 14px",
  padding: "11px 13px",
  borderRadius: 14,
  fontSize: 12.5,
  lineHeight: 1.55,
  color: hudColors.label,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(230, 248, 255, 0.5) 100%)",
  border: "1px solid rgba(255,255,255,0.75)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
};

const statLabel: CSSProperties = {
  color: hudColors.muted,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const linkButtonStyle: CSSProperties = {
  ...hudFont,
  margin: 0,
  padding: 0,
  border: "none",
  background: "none",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  color: hudColors.accent,
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

const newSessionIntroSteps = 3;

function PowerupLegendRow({
  slot,
  title,
  children,
}: {
  slot: "strength" | "noBounce" | "nowind";
  title: string;
  children: ReactNode;
}) {
  const a = POWERUP_SLOT_ACCENT[slot];
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        marginBottom: 10,
      }}
    >
      <div
        aria-hidden
        style={{
          flexShrink: 0,
          width: 30,
          height: 24,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.85)",
          backgroundImage: a.ready,
          boxShadow: a.shadow,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 12,
            color: hudColors.value,
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 11.5, lineHeight: 1.5, color: hudColors.label }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function StartGameModal({
  open,
  sessionReady,
  session,
  onContinue,
  onStartSession,
}: {
  open: boolean;
  sessionReady: boolean;
  session: PlaySession | null;
  onContinue: () => void;
  onStartSession: (battleCount: SessionBattleCount) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [newSessionStep, setNewSessionStep] = useState(0);
  /** Optional vehicle / controls / power-ups wizard; default is a short overview only. */
  const [gameConfigOpen, setGameConfigOpen] = useState(false);

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

  const selectedVehicle = resolveVehicleFromUrlParam(
    searchParams.get("vehicle")
  );

  useEffect(() => {
    if (open) {
      setNewSessionStep(0);
      setGameConfigOpen(false);
    }
  }, [open]);

  if (!open) return null;

  if (!sessionReady) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-label="Loading session"
        style={modalBackdrop}
      >
        <div style={startModalShell}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: hudColors.muted,
              textAlign: "center",
            }}
          >
            Loading…
          </p>
        </div>
      </div>
    );
  }

  const roundsDone =
    session !== null ? session.battlesWon + session.battlesLost : 0;
  const inProgress =
    session !== null && roundsDone < session.targetBattles;
  const hasStartedBattles = roundsDone > 0;

  const title =
    inProgress && hasStartedBattles ? "Continue session" : "Welcome";

  const rulesPanelContinue: CSSProperties = {
    ...rulesPanel,
    minHeight: 168,
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-game-title"
      style={modalBackdrop}
    >
      <div style={startModalShell}>
        <div
          style={{
            marginBottom: 14,
            paddingBottom: 12,
            borderBottom: "1px solid rgba(0, 114, 188, 0.12)",
          }}
        >
          <h2
            id="start-game-title"
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: hudColors.value,
              textShadow: "0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            {title}
          </h2>
          <div
            aria-hidden
            style={{
              marginTop: 10,
              height: 3,
              width: 48,
              borderRadius: 999,
              background:
                "linear-gradient(90deg, #00aeef 0%, #0072bc 55%, rgba(0,180,255,0.35) 100%)",
              boxShadow: "0 1px 4px rgba(0, 114, 188, 0.35)",
            }}
          />
        </div>

        {inProgress && session ? (
          <>
            <div style={rulesPanel}>
              Win a battle — hit the goal at or under par (strokes ≤ coins on the
              hole). The session is a win if your battle wins are at least your
              battle losses (ties count).
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  padding: "12px 10px",
                  textAlign: "center",
                  ...hudMiniPanel,
                }}
              >
                <div style={statLabel}>Battle progress</div>
                <div
                  style={{
                    color: hudColors.value,
                    fontWeight: 800,
                    fontSize: 26,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {roundsDone}
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 18,
                      opacity: 0.75,
                    }}
                  >
                    {" "}
                    / {session.targetBattles}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    color: hudColors.label,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <span style={{ color: hudColors.accent }}>
                    {session.battlesWon}
                  </span>
                  {" won · "}
                  <span style={{ color: hudColors.muted }}>
                    {session.battlesLost}
                  </span>
                  {" lost"}
                </div>
              </div>
              <div
                style={{
                  padding: "12px 10px",
                  textAlign: "center",
                  ...hudMiniPanel,
                }}
              >
                <div style={statLabel}>Session score</div>
                <div
                  style={{
                    color: hudColors.value,
                    fontWeight: 800,
                    fontSize: 17,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.25,
                    letterSpacing: "0.02em",
                  }}
                >
                  {formatSessionScoreHud(session, 0)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                burstVehicleStartConfetti(
                  selectedVehicle.mainRgb,
                  selectedVehicle.accentRgb
                );
                onContinue();
              }}
              style={goldPillButtonStyle({ disabled: false, fullWidth: true })}
            >
              Continue
            </button>
          </>
        ) : (
          <>
            {!gameConfigOpen ? (
              <div style={rulesPanel}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    color: hudColors.label,
                  }}
                >
                  Win battles by hitting the goal at or under par (strokes ≤ lane
                  coins). Your session wins if your battle wins are at least your
                  battle losses (ties count). Pick a length below to start.
                </p>
                <p
                  style={{
                    margin: "12px 0 6px",
                    fontSize: 11,
                    lineHeight: 1.45,
                    color: hudColors.muted,
                  }}
                >
                  Changing vehicle or reading extra help is optional — only if you
                  want to tweak your setup.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setGameConfigOpen(true);
                    setNewSessionStep(0);
                  }}
                  style={{ ...linkButtonStyle, display: "inline" }}
                >
                  Change game config
                </button>
              </div>
            ) : (
            <div style={rulesPanelContinue}>
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
                {newSessionStep === 0 && "Step 1 — Vehicle"}
                {newSessionStep === 1 && "Step 2 — How to play"}
                {newSessionStep === 2 && "Step 3 — Power-ups"}
              </p>

              {newSessionStep === 0 && (
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: hudColors.label,
                    }}
                  >
                    Optional — pick a vehicle for this session (default works
                    fine). You can change it any time before starting battles.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {PREDETERMINED_VEHICLES.map((v) => {
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
              )}

              {newSessionStep === 1 && (
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55 }}>
                    Win a battle — hit the goal at or under par (strokes ≤ coins
                    on the hole). The session is a win if your battle wins are at
                    least your battle losses (ties count).
                  </p>
                  <p
                    style={{
                      margin: "12px 0 0",
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      color: hudColors.label,
                    }}
                  >
                    Aim with the on-screen controls or{" "}
                    <strong style={{ color: hudColors.value }}>WASD</strong> /{" "}
                    <strong style={{ color: hudColors.value }}>arrows</strong>.
                    Tap <strong style={{ color: hudColors.value }}>Fire</strong>{" "}
                    or press <strong style={{ color: hudColors.value }}>Space</strong>{" "}
                    to start a charge window; extra taps add power. Open{" "}
                    <strong style={{ color: hudColors.value }}>Power-ups</strong>{" "}
                    before your first tap in a shot to apply boosts.
                  </p>
                </div>
              )}

              {newSessionStep === 2 && (
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: hudColors.label,
                    }}
                  >
                    Colors match the Power-ups dock. Tap a slot before your first
                    click on a shot (while not charging). You start with{" "}
                    {INITIAL_POWERUP_CHARGES} charges per implemented type.
                  </p>
                  <PowerupLegendRow slot="strength" title="Strength (orange)">
                    Each tap multiplies launch strength by 2 for that shot and
                    spends one strength charge. Stacks multiply (2×, 4×, 8×, …).
                  </PowerupLegendRow>
                  <PowerupLegendRow slot="noBounce" title="No bounce (violet)">
                    One tap spends one no-bounce charge: no bounces and no roll
                    after landing — the ball stops on first ground contact.
                  </PowerupLegendRow>
                  <PowerupLegendRow slot="nowind" title="No wind (cyan)">
                    One tap spends one charge and removes wind on the ball for
                    that shot (wind still updates for the next shot).
                  </PowerupLegendRow>
                </div>
              )}

              <div
                style={{
                  marginTop: "auto",
                  paddingTop: 10,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  borderTop: "1px solid rgba(0, 114, 188, 0.1)",
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  {newSessionStep > 0 ? (
                    <button
                      type="button"
                      style={linkButtonStyle}
                      onClick={() =>
                        setNewSessionStep((s) => Math.max(0, s - 1))
                      }
                    >
                      Back
                    </button>
                  ) : (
                    <button
                      type="button"
                      style={linkButtonStyle}
                      onClick={() => setGameConfigOpen(false)}
                    >
                      Back to overview
                    </button>
                  )}
                </span>
                <span>
                  {newSessionStep < newSessionIntroSteps - 1 ? (
                    <button
                      type="button"
                      style={linkButtonStyle}
                      onClick={() =>
                        setNewSessionStep((s) =>
                          Math.min(newSessionIntroSteps - 1, s + 1)
                        )
                      }
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="button"
                      style={linkButtonStyle}
                      onClick={() => setGameConfigOpen(false)}
                    >
                      Back to overview
                    </button>
                  )}
                </span>
              </div>
            </div>
            )}

            <p
              style={{
                margin: "0 0 12px",
                fontSize: 12,
                fontWeight: 600,
                color: hudColors.label,
                lineHeight: 1.45,
              }}
            >
              New session — pick length
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 8,
                marginBottom: 4,
              }}
            >
              {BATTLE_OPTIONS.map((battleCount) => (
                <button
                  key={battleCount}
                  type="button"
                  onClick={() => {
                    burstVehicleStartConfetti(
                      selectedVehicle.mainRgb,
                      selectedVehicle.accentRgb
                    );
                    onStartSession(battleCount);
                  }}
                  style={{
                    ...goldPillButtonStyle({
                      disabled: false,
                      fullWidth: true,
                    }),
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    padding: "10px 6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {battleCount}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      opacity: 0.92,
                      letterSpacing: "0.04em",
                    }}
                  >
                    battles
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
