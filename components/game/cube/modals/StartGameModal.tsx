"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { usePlayerStats } from "@/components/PlayerStatsProvider";
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
} from "@/components/playerVehicleConfig";
import {
  isVehicleUnlocked,
  PREMIUM_RATATA_VEHICLE_ID,
  resolvePlayerVehicle,
  shouldShowRatataBetaTag,
} from "@/lib/game/vehicleUnlock";
import { INITIAL_POWERUP_CHARGES } from "@/lib/game/constants";
import { burstVehicleStartConfetti } from "@/lib/game/confetti";
import {
  formatSessionScoreHud,
  type PlaySession,
  type SessionBattleCount,
} from "@/lib/game/playSession";
import type { SessionBiomeChoice } from "@/lib/game/sessionBattleMaps";

const BATTLE_OPTIONS: SessionBattleCount[] = [3, 5, 9];

/** Scoped hover motion for war-length pills (gamified lift + tilt). */
const battleLengthButtonCss = `
  .ggsBattleLenBtn {
    transition: transform 0.22s cubic-bezier(0.34, 1.45, 0.64, 1),
      box-shadow 0.22s ease,
      filter 0.22s ease;
    will-change: transform;
  }
  .ggsBattleLenBtn:hover {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.75),
      0 10px 22px rgba(0, 82, 130, 0.38),
      0 0 0 1px rgba(255, 255, 255, 0.55);
    filter: brightness(1.07) saturate(1.06);
  }
  .ggsBattleLenBtn:active {
    transition-duration: 0.08s;
    filter: brightness(0.98);
  }
  .ggsBattleLenBtn:nth-child(1):hover {
    transform: translate(-3px, -6px) rotate(-2.5deg) scale(1.06);
  }
  .ggsBattleLenBtn:nth-child(2):hover {
    transform: translateY(-8px) scale(1.08);
  }
  .ggsBattleLenBtn:nth-child(3):hover {
    transform: translate(3px, -6px) rotate(2.5deg) scale(1.06);
  }
  .ggsBattleLenBtn:nth-child(1):active,
  .ggsBattleLenBtn:nth-child(3):active {
    transform: translate(0, -2px) rotate(0deg) scale(1.02);
  }
  .ggsBattleLenBtn:nth-child(2):active {
    transform: translateY(-3px) scale(1.03);
  }
  @media (prefers-reduced-motion: reduce) {
    .ggsBattleLenBtn {
      transition: filter 0.15s ease, box-shadow 0.15s ease;
    }
    .ggsBattleLenBtn:hover,
    .ggsBattleLenBtn:active {
      transform: none;
    }
    .ggsBattleLenBtn:hover {
      filter: brightness(1.05);
    }
  }
`;

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

/** Welcome overview — slightly richer surface + room for segmented rules. */
const rulesWelcomePanel: CSSProperties = (() => {
  const { background: _omitBg, ...rulesRest } = rulesPanel;
  return {
    ...rulesRest,
    padding: "12px 12px 11px",
    backgroundImage: [
      "radial-gradient(ellipse 95% 80% at 100% 0%, rgba(0, 174, 239, 0.09) 0%, transparent 55%)",
      "radial-gradient(ellipse 70% 55% at 0% 100%, rgba(0, 114, 188, 0.06) 0%, transparent 50%)",
      "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(218, 244, 255, 0.58) 100%)",
    ].join(", "),
    border: "1px solid rgba(0, 114, 188, 0.14)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.92), 0 1px 8px rgba(0, 82, 130, 0.06)",
  };
})();

const welcomeRuleRow: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  marginBottom: 10,
};

const welcomeRuleBadge: CSSProperties = {
  flexShrink: 0,
  width: 22,
  height: 22,
  marginTop: 1,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 800,
  color: "#ffffff",
  textShadow: "0 1px 2px rgba(0, 35, 70, 0.45)",
  backgroundImage:
    "linear-gradient(155deg, #5ecfff 0%, #00aeef 45%, #0072bc 100%)",
  border: "1px solid rgba(255,255,255,0.65)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 6px rgba(0, 82, 130, 0.22)",
};

const welcomeRuleTitle: CSSProperties = {
  fontSize: 11.5,
  fontWeight: 800,
  letterSpacing: "0.02em",
  color: hudColors.value,
  marginBottom: 3,
  lineHeight: 1.25,
};

const welcomeRuleBody: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  color: hudColors.label,
  margin: 0,
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

const newSessionIntroSteps = 4;

function PowerupLegendRow({
  slot,
  title,
  children,
}: {
  slot: keyof typeof POWERUP_SLOT_ACCENT;
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
  onStartSession: (
    battleCount: SessionBattleCount,
    biomeChoice: SessionBiomeChoice
  ) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { stats } = usePlayerStats();
  const [newSessionStep, setNewSessionStep] = useState(0);
  /** Optional vehicle / controls / power-ups wizard; default is a short overview only. */
  const [gameConfigOpen, setGameConfigOpen] = useState(false);
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

  const selectedVehicle = resolvePlayerVehicle(
    searchParams.get("vehicle"),
    stats
  );

  useEffect(() => {
    if (open) {
      setNewSessionStep(0);
      setGameConfigOpen(false);
      setBiomeChoice("random");
    }
  }, [open]);

  if (!open) return null;

  if (!sessionReady) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-label="Loading war"
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
    inProgress && hasStartedBattles ? "Continue war" : "Welcome";

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
        <style dangerouslySetInnerHTML={{ __html: battleLengthButtonCss }} />
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
              hole). The war is a win if your battle wins are at least your
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
                <div style={statLabel}>War score</div>
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
              <div style={rulesWelcomePanel}>
                <div
                  style={{
                    ...welcomeRuleRow,
                    paddingBottom: 10,
                    marginBottom: 10,
                    borderBottom: "1px solid rgba(0, 114, 188, 0.1)",
                  }}
                >
                  <span aria-hidden style={welcomeRuleBadge}>
                    1
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={welcomeRuleTitle}>Win the battle</div>
                    <p style={welcomeRuleBody}>
                      Reach the goal at or under{" "}
                      <strong style={{ color: hudColors.value }}>par</strong> —
                      strokes ≤ lane coins on the hole.
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    ...welcomeRuleRow,
                    paddingBottom: 10,
                    marginBottom: 10,
                    borderBottom: "1px solid rgba(0, 114, 188, 0.1)",
                  }}
                >
                  <span aria-hidden style={welcomeRuleBadge}>
                    2
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={welcomeRuleTitle}>Win the war</div>
                    <p style={welcomeRuleBody}>
                      Your{" "}
                      <strong style={{ color: hudColors.value }}>
                        battle wins
                      </strong>{" "}
                      should be at least your{" "}
                      <strong style={{ color: hudColors.value }}>
                        battle losses
                      </strong>{" "}
                      (ties count).
                    </p>
                  </div>
                </div>
                <div style={{ ...welcomeRuleRow, marginBottom: 12 }}>
                  <span aria-hidden style={welcomeRuleBadge}>
                    3
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={welcomeRuleTitle}>Start playing</div>
                    <p style={welcomeRuleBody}>
                      Pick a war length below —{" "}
                      <strong style={{ color: hudColors.accent }}>3</strong>,{" "}
                      <strong style={{ color: hudColors.accent }}>5</strong>, or{" "}
                      <strong style={{ color: hudColors.accent }}>9</strong>{" "}
                      battles.
                    </p>
                  </div>
                </div>
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: 11,
                    lineHeight: 1.45,
                    color: hudColors.muted,
                    paddingTop: 2,
                    borderTop: "1px dashed rgba(0, 114, 188, 0.14)",
                  }}
                >
                  Optional: change vehicle or read extra help if you want to tweak
                  your setup.
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
                {newSessionStep === 0 && "Step 1 — Biome"}
                {newSessionStep === 1 && "Step 2 — Vehicle"}
                {newSessionStep === 2 && "Step 3 — How to play"}
                {newSessionStep === 3 && "Step 4 — Power-ups"}
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
                    Choose fairway style for this war. Random picks among plain,
                    desert, forest, and snow independently for each battle; a
                    fixed choice uses that biome for every battle.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {(
                      [
                        { id: "random" as const, label: "Random (each battle)" },
                        { id: "plain" as const, label: "Plain" },
                        { id: "desert" as const, label: "Desert" },
                        { id: "forest" as const, label: "Forest" },
                        { id: "snow" as const, label: "Snow" },
                      ] as const
                    ).map((opt) => {
                      const selected = biomeChoice === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setBiomeChoice(opt.id)}
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
                              flex: 1,
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: hudColors.value,
                            }}
                          >
                            {opt.label}
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
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: hudColors.label,
                    }}
                  >
                    Optional — pick a vehicle for this war (default works
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
                      const unlocked = isVehicleUnlocked(stats, v.id);
                      const betaTag =
                        shouldShowRatataBetaTag() &&
                        v.id === PREMIUM_RATATA_VEHICLE_ID;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={!unlocked}
                          onClick={() => {
                            if (!unlocked) return;
                            setVehicleInUrl(v.id);
                          }}
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
                            cursor: unlocked ? "pointer" : "not-allowed",
                            opacity: unlocked ? 1 : 0.55,
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
                            {betaTag ? (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  letterSpacing: "0.06em",
                                  textTransform: "uppercase",
                                  padding: "2px 6px",
                                  borderRadius: 6,
                                  color: "#ffffff",
                                  background:
                                    "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                                  border: "1px solid rgba(255,255,255,0.55)",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                                }}
                              >
                                Beta
                              </span>
                            ) : null}
                            {!unlocked ? (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  color: hudColors.muted,
                                }}
                              >
                                Win 1 battle to unlock
                              </span>
                            ) : null}
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

              {newSessionStep === 2 && (
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55 }}>
                    Win a battle — hit the goal at or under par (strokes ≤ coins
                    on the hole). The war is a win if your battle wins are at
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
                    Hold the <strong style={{ color: hudColors.value }}>
                      bottom-right button
                    </strong>{" "}
                    or press <strong style={{ color: hudColors.value }}>Space</strong>{" "}
                    to start a charge window; extra taps add power. Open{" "}
                    <strong style={{ color: hudColors.value }}>Power-ups</strong>{" "}
                    before your first tap in a shot to apply boosts.
                  </p>
                </div>
              )}

              {newSessionStep === 3 && (
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
                  <PowerupLegendRow slot="guideline" title="Guideline (teal)">
                    One tap spends one charge: a dashed line follows your aim at
                    full strength bar (then your actual power while charging) to
                    the first landing or goal — no wind in the preview; strength
                    stacks apply.
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
              New war — pick length
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
                  className="ggsBattleLenBtn"
                  onClick={() => {
                    burstVehicleStartConfetti(
                      selectedVehicle.mainRgb,
                      selectedVehicle.accentRgb
                    );
                    onStartSession(battleCount, biomeChoice);
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
