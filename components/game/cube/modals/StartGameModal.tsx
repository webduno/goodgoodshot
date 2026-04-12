"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { usePlayerStats } from "@/components/PlayerStatsProvider";
import { usePlayerShopInventory } from "@/lib/shop/usePlayerShopInventory";
import {
  glassFaceMultiplayer,
  goldPillButtonStyle,
  hudColors,
  hudFont,
  hudMiniPanel,
  modalBackdrop,
  plazaHubButtonStyle,
  plazaPvpDockButtonStyle,
  POWERUP_SLOT_ACCENT,
} from "@/components/gameHudStyles";
import { PvpOpenRoomsList } from "@/components/game/cube/modals/PvpOpenRoomsList";
import {
  PREDETERMINED_VEHICLES,
  rgbTupleToCss,
  type PlayerVehicleConfig,
  vehicleIdForQueryString,
} from "@/components/playerVehicleConfig";
import {
  isVehicleUnlocked,
  lockedVehicleSelectionHint,
  PREMIUM_RATATA_VEHICLE_ID,
  shouldShowRatataBetaTag,
} from "@/lib/game/vehicleUnlock";
import { useResolvedPlayerVehicle } from "@/lib/game/useResolvedPlayerVehicle";
import { burstVehicleStartConfetti } from "@/lib/game/confetti";
import {
  formatSessionScoreHud,
  type PlaySession,
  type SessionBattleCount,
} from "@/lib/game/playSession";
import type { SessionBiomeChoice } from "@/lib/game/sessionBattleMaps";
import {
  createPvpRoom,
  joinFirstOpenPvpRoom,
  joinPvpRoomById,
} from "@/lib/pvp/plazaActions";
import { schedulePvpNavigateWithReload } from "@/lib/pvp/pvpNavigate";
import { ensureSupabaseSession } from "@/lib/supabase/ensureSession";
import { BGM, startBgmLoop, stopBgm } from "@/lib/sfx/bgMusicPlayer";

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

/** Frutiger Aero: soft glass, specular bands, asymmetric “bubble” corners (not a plain square). */
const startModalShell: CSSProperties = {
  ...hudFont,
  position: "relative",
  isolation: "isolate",
  /** Lets `position:absolute` + `transform` sit on the rim without clipping. */
  overflow: "visible",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  maxWidth: 400,
  width: "min(94vw, 400px)",
  padding: "24px 20px 28px",
  borderRadius: "38px 30px 42px 34px",
  border: "1px solid rgba(255,255,255,0.95)",
  boxShadow: [
    "inset 0 2px 8px rgba(255,255,255,0.9)",
    "inset 0 -18px 36px rgba(0, 185, 230, 0.07)",
    "0 8px 0 rgba(255,255,255,0.35) inset",
    "0 28px 70px rgba(0, 45, 95, 0.3)",
    "0 0 0 1px rgba(0, 210, 255, 0.22)",
  ].join(", "),
  textAlign: "left",
  backgroundImage: [
    "radial-gradient(ellipse 125% 90% at 50% -18%, rgba(255,255,255,0.99) 0%, transparent 55%)",
    "radial-gradient(ellipse 70% 55% at 92% 8%, rgba(180, 255, 255, 0.45) 0%, transparent 58%)",
    "radial-gradient(ellipse 55% 45% at 4% 96%, rgba(0, 230, 255, 0.14) 0%, transparent 52%)",
    "linear-gradient(162deg, rgba(255,255,255,0.97) 0%, rgba(220, 248, 255, 0.93) 40%, rgba(150, 225, 255, 0.88) 100%)",
  ].join(", "),
};

/** Glassy cyan orb — same look as the top-right “i” help bubble. */
const startModalBubbleOrbStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  cursor: "pointer",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3,
  background:
    "radial-gradient(circle at 38% 30%, rgba(255,255,255,0.98) 0%, rgba(140, 235, 255, 0.78) 40%, rgba(0, 175, 225, 0.55) 100%)",
  border: "1px solid rgba(255,255,255,0.92)",
  boxShadow:
    "inset 0 2px 0 rgba(255,255,255,0.75), 0 6px 18px rgba(0, 82, 130, 0.32)",
  ...hudFont,
};

const startModalHelpBubblePosition: CSSProperties = {
  position: "absolute",
  top: 8,
  right: 12,
  transform: "translate(36%, -40%)",
};

const startModalMusicBubblePosition: CSSProperties = {
  position: "absolute",
  bottom: 8,
  right: 12,
  transform: "translate(36%, 40%)",
};

/** Bottom CTAs: anchor to wrapper bottom, then `translateY(50%)` to straddle the rim. */
const startModalActionsAnchor: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  transform: "translateY(50%)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  zIndex: 2,
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

/** Welcome overview — short pitch + room for big type / icons. */
const rulesWelcomePanel: CSSProperties = (() => {
  const { background: _omitBg, ...rulesRest } = rulesPanel;
  return {
    ...rulesRest,
    padding: "14px 14px 12px",
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

/** Top pitch + links — no inset “card”; reads as one band under the title (wireframe top strip). */
const welcomeIntroFlat: CSSProperties = {
  margin: "0 0 14px",
  padding: "0 0 12px",
  borderBottom: "1px solid rgba(0, 114, 188, 0.14)",
};

const statLabel: CSSProperties = {
  color: hudColors.muted,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 6,
};

/** Continue-war: glossy inset panel; asymmetric corners; warm rim when progress exists. */
function continueWarProgressCardStyle(hasSavedProgress: boolean): CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    marginBottom: 18,
    padding: "16px 14px 14px",
    borderRadius: "26px 22px 28px 24px",
    textAlign: "center",
    ...hudFont,
    ...(hasSavedProgress
      ? {
          backgroundImage: [
            "radial-gradient(ellipse 100% 75% at 50% 0%, rgba(255, 220, 140, 0.5) 0%, transparent 60%)",
            "linear-gradient(168deg, rgba(255,255,255,0.98) 0%, rgba(255, 238, 210, 0.78) 50%, rgba(255, 224, 185, 0.62) 100%)",
          ].join(", "),
          border: "1px solid rgba(230, 175, 90, 0.5)",
          boxShadow: [
            "inset 0 2px 0 rgba(255,255,255,0.95)",
            "inset 0 -10px 24px rgba(200, 130, 40, 0.08)",
            "0 8px 22px rgba(140, 90, 30, 0.12)",
          ].join(", "),
        }
      : {
          backgroundImage: [
            "radial-gradient(ellipse 95% 70% at 50% 0%, rgba(120, 230, 255, 0.22) 0%, transparent 58%)",
            "linear-gradient(175deg, rgba(255,255,255,0.96) 0%, rgba(210, 246, 255, 0.82) 100%)",
          ].join(", "),
          border: "1px solid rgba(0, 160, 220, 0.22)",
          boxShadow: [
            "inset 0 2px 0 rgba(255,255,255,0.92)",
            "inset 0 -8px 20px rgba(0, 170, 220, 0.06)",
            "0 6px 18px rgba(0, 82, 130, 0.1)",
          ].join(", "),
        }),
  };
}

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

function getPvpErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

type WelcomeStartMode = null | "single" | "multi";

function WelcomeModeFlow({
  mode,
  onModeChange,
  biomeChoice,
  onStartSession,
  selectedVehicle,
  pvpLobbyBusy,
  pvpLobbyError,
  onCreatePvp,
  onCreatePve,
  onQuickPlay,
  onJoinRoom,
  goToPlaza,
  plazaButtonLabel,
  topMargin = 12,
}: {
  mode: WelcomeStartMode;
  onModeChange: (m: WelcomeStartMode) => void;
  /** Space below intro; use 0 when intro is hidden (drill-in views). */
  topMargin?: number;
  biomeChoice: SessionBiomeChoice;
  onStartSession: (
    battleCount: SessionBattleCount,
    biomeChoice: SessionBiomeChoice
  ) => void;
  selectedVehicle: PlayerVehicleConfig;
  pvpLobbyBusy: boolean;
  pvpLobbyError: string | null;
  onCreatePvp: () => void | Promise<void>;
  onCreatePve: () => void | Promise<void>;
  onQuickPlay: () => void | Promise<void>;
  onJoinRoom: (roomId: string) => void | Promise<void>;
  goToPlaza: () => void;
  plazaButtonLabel: string;
}) {
  const modeTileBtn = (): CSSProperties => ({
    ...goldPillButtonStyle({
      disabled: pvpLobbyBusy,
      fullWidth: false,
    }),
    flex: 1,
    minWidth: 0,
    minHeight: 120,
    borderRadius: 22,
    padding: "14px 8px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    boxShadow: [
      "inset 0 2px 0 rgba(255,255,255,0.55)",
      "0 5px 0 rgba(0, 60, 100, 0.16)",
      "0 14px 28px rgba(0, 82, 130, 0.24)",
    ].join(", "),
  });

  const modeTileBtnMultiplayer = (): CSSProperties => ({
    ...modeTileBtn(),
    ...(pvpLobbyBusy
      ? {}
      : {
          backgroundImage: glassFaceMultiplayer,
          border: "1px solid rgba(255,255,255,0.92)",
          boxShadow: [
            "inset 0 2px 0 rgba(255,255,255,0.58)",
            "0 5px 0 rgba(75, 25, 120, 0.22)",
            "0 14px 32px rgba(88, 28, 135, 0.38)",
          ].join(", "),
        }),
  });

  if (mode === null) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginTop: topMargin,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 10,
            alignItems: "stretch",
          }}
        >
          <button
            type="button"
            disabled={pvpLobbyBusy}
            onClick={() => onModeChange("single")}
            style={modeTileBtn()}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#ffffff",
                textShadow: "0 1px 2px rgba(0, 45, 95, 0.45)",
              }}
            >
              Singleplayer
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                opacity: 0.92,
                color: "rgba(255,255,255,0.95)",
              }}
            >
              Solo wars
            </span>
          </button>
          <button
            type="button"
            disabled={pvpLobbyBusy}
            onClick={() => onModeChange("multi")}
            style={modeTileBtnMultiplayer()}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#ffffff",
                textShadow:
                  "0 1px 2px rgba(40, 0, 80, 0.55), 0 0 1px rgba(0, 0, 0, 0.35)",
              }}
            >
              Multiplayer
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                opacity: 0.94,
                color: "rgba(255,255,255,0.97)",
                textShadow: "0 1px 2px rgba(40, 0, 80, 0.45)",
              }}
            >
              Online
            </span>
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={goToPlaza}
            style={plazaHubButtonStyle({
              variant: "chip",
            })}
          >
            {plazaButtonLabel}
          </button>
        </div>
      </div>
    );
  }

  if (mode === "single") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: topMargin,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            color: hudColors.label,
            lineHeight: 1.45,
            textAlign: "left",
          }}
        >
          New war — pick length
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 8,
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
        <button
          type="button"
          onClick={goToPlaza}
          style={plazaHubButtonStyle({
            variant: "full",
            fullWidth: true,
          })}
        >
          {plazaButtonLabel}
        </button>
        <button
          type="button"
          onClick={() => onModeChange(null)}
          style={{ ...linkButtonStyle, alignSelf: "center" }}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginTop: topMargin,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 600,
          color: hudColors.label,
          lineHeight: 1.45,
          textAlign: "left",
        }}
      >
        Create or join lobbies
      </p>
      {pvpLobbyError ? (
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            color: "#b42318",
            lineHeight: 1.35,
          }}
        >
          {pvpLobbyError}
        </p>
      ) : null}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <button
          type="button"
          disabled={pvpLobbyBusy}
          onClick={() => void onCreatePvp()}
          style={{
            ...plazaPvpDockButtonStyle({
              variant: "create",
              disabled: pvpLobbyBusy,
            }),
            flex: "1 1 calc(50% - 4px)",
            minWidth: 120,
            boxSizing: "border-box",
          }}
        >
          New PvP
        </button>
        <button
          type="button"
          disabled={pvpLobbyBusy}
          onClick={() => void onCreatePve()}
          style={{
            ...plazaPvpDockButtonStyle({
              variant: "create",
              disabled: pvpLobbyBusy,
            }),
            flex: "1 1 calc(50% - 4px)",
            minWidth: 120,
            boxSizing: "border-box",
          }}
        >
          New PvE
        </button>
      </div>
      <button
        type="button"
        disabled={pvpLobbyBusy}
        onClick={() => void onQuickPlay()}
        style={{
          ...plazaPvpDockButtonStyle({
            variant: "quick",
            disabled: pvpLobbyBusy,
          }),
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        Quick match
      </button>
      <PvpOpenRoomsList
        enabled={mode === "multi"}
        busy={pvpLobbyBusy}
        onJoinRoom={onJoinRoom}
        compactTitle
      />
      <button
        type="button"
        onClick={goToPlaza}
        style={plazaHubButtonStyle({
          variant: "full",
          fullWidth: true,
        })}
      >
        {plazaButtonLabel}
      </button>
      <button
        type="button"
        onClick={() => onModeChange(null)}
        style={{ ...linkButtonStyle, alignSelf: "center" }}
      >
        Back
      </button>
    </div>
  );
}

/** ~5 words per line — artillery / vehicle battles (Gunbound-style), not golf. */
function WelcomePitchBlurb() {
  const lines: { icon: string; text: string }[] = [
    { icon: "🎯", text: "Aim angle and power, then shoot." },
    { icon: "⚔️", text: "Win more battles than losses." },
    {
      icon: "🚀",
      text: "Tap Singleplayer or Multiplayer below — then pick how to play.",
    },
  ];
  return (
    <div>
      {lines.map((row, i) => (
        <div
          key={row.text}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: i < lines.length - 1 ? 14 : 0,
          }}
        >
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              fontSize: 28,
              lineHeight: 1,
              filter: "drop-shadow(0 2px 2px rgba(0,60,100,0.2))",
            }}
          >
            {row.icon}
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.35,
              color: hudColors.value,
              textShadow: "0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            {row.text}
          </p>
        </div>
      ))}
    </div>
  );
}

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
  onOpenHelp,
}: {
  open: boolean;
  sessionReady: boolean;
  session: PlaySession | null;
  onContinue: () => void;
  onStartSession: (
    battleCount: SessionBattleCount,
    biomeChoice: SessionBiomeChoice
  ) => void;
  /** Shown on continue-war; opens in-game help / how to play. */
  onOpenHelp?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { stats } = usePlayerStats();
  const { inventory: shopInventory } = usePlayerShopInventory();
  const [newSessionStep, setNewSessionStep] = useState(0);
  /** Optional vehicle / controls / power-ups wizard; default is a short overview only. */
  const [gameConfigOpen, setGameConfigOpen] = useState(false);
  const [biomeChoice, setBiomeChoice] =
    useState<SessionBiomeChoice>("random");
  const [welcomeStartMode, setWelcomeStartMode] =
    useState<WelcomeStartMode>(null);
  const [pvpLobbyBusy, setPvpLobbyBusy] = useState(false);
  const [pvpLobbyError, setPvpLobbyError] = useState<string | null>(null);
  const [welcomeBgmOn, setWelcomeBgmOn] = useState(false);

  const toggleWelcomeBgm = useCallback(() => {
    setWelcomeBgmOn((prev) => {
      if (!prev) {
        startBgmLoop(BGM.welcome);
        return true;
      }
      stopBgm();
      return false;
    });
  }, []);

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

  const goToPlaza = useCallback(() => {
    const p = new URLSearchParams();
    const v = vehicleIdForQueryString(selectedVehicle);
    if (v) p.set("vehicle", v);
    const qs = p.toString();
    router.push(qs ? `/plaza?${qs}` : "/plaza");
  }, [router, selectedVehicle]);

  const onPvpCreateRoom = useCallback(async () => {
    if (pvpLobbyBusy) return;
    setPvpLobbyBusy(true);
    setPvpLobbyError(null);
    try {
      await ensureSupabaseSession();
      const id = await createPvpRoom("pvp", biomeChoice);
      const p = new URLSearchParams();
      const v = vehicleIdForQueryString(selectedVehicle);
      if (v) p.set("vehicle", v);
      const qs = p.toString();
      schedulePvpNavigateWithReload(qs ? `/pvp/${id}?${qs}` : `/pvp/${id}`);
    } catch (e) {
      setPvpLobbyError(getPvpErrorMessage(e, "PvP setup failed"));
    } finally {
      setPvpLobbyBusy(false);
    }
  }, [pvpLobbyBusy, selectedVehicle, biomeChoice]);

  const onPveCreateRoom = useCallback(async () => {
    if (pvpLobbyBusy) return;
    setPvpLobbyBusy(true);
    setPvpLobbyError(null);
    try {
      await ensureSupabaseSession();
      const id = await createPvpRoom("pve", biomeChoice);
      const p = new URLSearchParams();
      const v = vehicleIdForQueryString(selectedVehicle);
      if (v) p.set("vehicle", v);
      const qs = p.toString();
      schedulePvpNavigateWithReload(qs ? `/pvp/${id}?${qs}` : `/pvp/${id}`);
    } catch (e) {
      setPvpLobbyError(getPvpErrorMessage(e, "PvE setup failed"));
    } finally {
      setPvpLobbyBusy(false);
    }
  }, [pvpLobbyBusy, selectedVehicle, biomeChoice]);

  const onPvpQuickPlay = useCallback(async () => {
    if (pvpLobbyBusy) return;
    setPvpLobbyBusy(true);
    setPvpLobbyError(null);
    try {
      await ensureSupabaseSession();
      const id = await joinFirstOpenPvpRoom();
      if (!id) {
        setPvpLobbyError("No open room — create one");
        return;
      }
      const p = new URLSearchParams();
      const v = vehicleIdForQueryString(selectedVehicle);
      if (v) p.set("vehicle", v);
      const qs = p.toString();
      schedulePvpNavigateWithReload(qs ? `/pvp/${id}?${qs}` : `/pvp/${id}`);
    } catch (e) {
      setPvpLobbyError(getPvpErrorMessage(e, "PvP join failed"));
    } finally {
      setPvpLobbyBusy(false);
    }
  }, [pvpLobbyBusy, selectedVehicle]);

  const onJoinRoomFromList = useCallback(
    async (roomId: string) => {
      if (pvpLobbyBusy) return;
      setPvpLobbyBusy(true);
      setPvpLobbyError(null);
      try {
        await ensureSupabaseSession();
        await joinPvpRoomById(roomId);
        const p = new URLSearchParams();
        const v = vehicleIdForQueryString(selectedVehicle);
        if (v) p.set("vehicle", v);
        const qs = p.toString();
        schedulePvpNavigateWithReload(
          qs ? `/pvp/${roomId}?${qs}` : `/pvp/${roomId}`
        );
      } catch (e) {
        setPvpLobbyError(getPvpErrorMessage(e, "Could not join room"));
      } finally {
        setPvpLobbyBusy(false);
      }
    },
    [pvpLobbyBusy, selectedVehicle]
  );

  useEffect(() => {
    if (open) {
      setNewSessionStep(0);
      setGameConfigOpen(false);
      setBiomeChoice("random");
      setWelcomeStartMode(null);
      setPvpLobbyError(null);
      setWelcomeBgmOn(false);
    }
  }, [open]);

  useEffect(() => {
    setPvpLobbyError(null);
  }, [welcomeStartMode]);

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

  const isFirstVisitWelcome =
    stats.totalShotsLifetime === 0 && stats.lastCompletedGame === null;

  const title = (() => {
    if (inProgress && hasStartedBattles) return "Continue war";
    if (inProgress) return "Welcome back";
    return "Welcome to GG-Shot";
  })();

  const showStandardWarPick = !isFirstVisitWelcome || gameConfigOpen;

  const showWelcomeMusicBubble =
    !inProgress && !gameConfigOpen && welcomeStartMode === null;

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
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            borderRadius: "inherit",
            overflow: "hidden",
            zIndex: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-20%",
              left: "-14%",
              width: "58%",
              height: "44%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 40% 40%, rgba(160, 250, 255, 0.52) 0%, transparent 68%)",
              filter: "blur(36px)",
              opacity: 0.92,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-14%",
              right: "-10%",
              width: "54%",
              height: "42%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 55% 45%, rgba(0, 215, 255, 0.26) 0%, transparent 72%)",
              filter: "blur(32px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "6%",
              right: "-4%",
              width: "46%",
              height: "22%",
              borderRadius: "50%",
              background:
                "linear-gradient(108deg, transparent 0%, rgba(255,255,255,0.62) 48%, transparent 78%)",
              filter: "blur(10px)",
              opacity: 0.88,
            }}
          />
        </div>
        {inProgress && session ? (
          <button
            type="button"
            onClick={goToPlaza}
            style={{
              position: "absolute",
              top: -20,
              right: 70,
              zIndex: 3,
              ...plazaHubButtonStyle({ variant: "compact" }),
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Go to Plaza 🌳
          </button>
        ) : null}
        {onOpenHelp ? (
          <button
            type="button"
            aria-label="How to play"
            onClick={onOpenHelp}
            style={{
              ...startModalBubbleOrbStyle,
              ...startModalHelpBubblePosition,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                fontStyle: "italic",
                lineHeight: 1,
                color: hudColors.value,
                textShadow: "0 1px 0 rgba(255,255,255,0.85)",
              }}
            >
              i
            </span>
          </button>
        ) : null}
        {showWelcomeMusicBubble ? (
          <button
            type="button"
            aria-label={welcomeBgmOn ? "Pause music" : "Play music"}
            title={welcomeBgmOn ? "Pause music" : "Play music"}
            onClick={toggleWelcomeBgm}
            style={{
              ...startModalBubbleOrbStyle,
              ...startModalMusicBubblePosition,
              color: hudColors.value,
            }}
          >
            {welcomeBgmOn ? (
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                aria-hidden
                style={{
                  display: "block",
                  filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.85))",
                }}
              >
                <path
                  fill="currentColor"
                  d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"
                />
              </svg>
            ) : (
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                aria-hidden
                style={{
                  display: "block",
                  marginLeft: 3,
                  filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.85))",
                }}
              >
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        ) : null}
        <div style={{ position: "relative", zIndex: 1 }}>
        <style dangerouslySetInnerHTML={{ __html: battleLengthButtonCss }} />
        <div
          style={{
            marginBottom: 14,
            paddingBottom: 12,
            paddingRight: inProgress && session ? 168 : 0,
            borderBottom: "1px solid rgba(0, 150, 200, 0.14)",
          }}
        >
          <h2
            id="start-game-title"
            style={{
              margin: 0,
              fontSize: 25,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.12,
              color: hudColors.value,
              textShadow:
                "0 1px 0 rgba(255,255,255,0.95), 0 0 24px rgba(180, 240, 255, 0.5)",
            }}
          >
            {title}
          </h2>
          <div
            aria-hidden
            style={{
              marginTop: 11,
              height: 5,
              width: "min(72%, 220px)",
              borderRadius: "999px 999px 4px 999px",
              background:
                "linear-gradient(92deg, #5ce1ff 0%, #00aeef 28%, #0072bc 62%, rgba(120, 230, 255, 0.35) 100%)",
              boxShadow:
                "0 2px 8px rgba(0, 160, 220, 0.45), inset 0 1px 0 rgba(255,255,255,0.75)",
            }}
          />
        </div>

        {inProgress && session ? (
          <div
            style={{
              position: "relative",
              width: "100%",
              paddingBottom: 92,
            }}
          >
            <div
              style={{
                ...continueWarProgressCardStyle(hasStartedBattles),
                marginBottom: 0,
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 5,
                  borderRadius: "26px 22px 0 0",
                  background:
                    "linear-gradient(90deg, rgba(120, 240, 255, 0.95) 0%, #00c8ff 35%, #00aeef 70%, rgba(180, 255, 255, 0.4) 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
                }}
              />
              {hasStartedBattles ? (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    padding: "3px 8px",
                    borderRadius: 999,
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#6b4810",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255, 230, 170, 0.95) 100%)",
                    border: "1px solid rgba(210, 160, 70, 0.5)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(160, 100, 30, 0.15)",
                    transform: "translate(20%, -45%)",
                    zIndex: 1,
                  }}
                >
                  Current Stats
                </div>
              ) : null}
              <div
                style={{
                  paddingTop: 10,
                  color: hudColors.value,
                  fontWeight: 800,
                  fontSize: 36,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  textShadow:
                    "0 1px 0 rgba(255,255,255,0.9), 0 0 20px rgba(160, 235, 255, 0.35)",
                }}
              >
                {roundsDone}
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 23,
                    opacity: 0.72,
                  }}
                >
                  {" "}
                  / {session.targetBattles} Battles
                </span> 
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 12px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: "0.03em",
                    color: hudColors.value,
                    background: hasStartedBattles
                      ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255, 248, 225, 0.92) 100%)"
                      : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(220, 244, 255, 0.75) 100%)",
                    border: hasStartedBattles
                      ? "1px solid rgba(215, 170, 80, 0.42)"
                      : "1px solid rgba(0, 150, 200, 0.22)",
                    boxShadow:
                      "inset 0 2px 0 rgba(255,255,255,0.95), 0 3px 10px rgba(0, 90, 130, 0.08)",
                  }}
                >
                  {formatSessionScoreHud(session, 0)}
                </span>
                <span
                  aria-hidden
                  style={{
                    opacity: 0.35,
                    fontWeight: 800,
                    color: hudColors.accent,
                  }}
                >
                  ·
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: hudColors.label,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <span style={{ color: hudColors.accent }}>
                    {session.battlesWon}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.75, marginLeft: 3 }}>Win(s)</span>
                  <span style={{ margin: "0 3px", opacity: 0.35 }}>·</span>
                  <span style={{ color: hudColors.muted }}>
                    {session.battlesLost}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.75, marginLeft: 3 }}>Loss(es)</span>
                </span>
              </div>
            </div>
            <div style={startModalActionsAnchor}>
              <button
                type="button"
                onClick={() => {
                  burstVehicleStartConfetti(
                    selectedVehicle.mainRgb,
                    selectedVehicle.accentRgb
                  );
                  onContinue();
                }}
                style={{
                  ...goldPillButtonStyle({ disabled: false, fullWidth: true }),
                  padding: "15px 20px",
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  boxShadow: [
                    "inset 0 1px 0 rgba(255,255,255,0.65)",
                    "0 4px 0 rgba(0, 60, 100, 0.22)",
                    "0 14px 28px rgba(0, 82, 130, 0.38)",
                  ].join(", "),
                }}
              >
                Continue Battle ⚔️
              </button>
            </div>
          </div>
        ) : (
          <>
            {!gameConfigOpen ? (
              isFirstVisitWelcome ? (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                  }}
                >
                  {welcomeStartMode === null ? (
                    <div style={welcomeIntroFlat}>
                      <WelcomePitchBlurb />
                      <div
                        style={{
                          margin: "10px 0 0",
                          fontSize: 11,
                          lineHeight: 1.4,
                          color: hudColors.muted,
                          paddingTop: 10,
                          borderTop: "1px dashed rgba(0, 114, 188, 0.14)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setGameConfigOpen(true);
                            setNewSessionStep(0);
                          }}
                          style={{
                            ...linkButtonStyle,
                            display: "inline",
                            fontSize: 11,
                          }}
                        >
                          Change Game Config
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <WelcomeModeFlow
                    mode={welcomeStartMode}
                    onModeChange={setWelcomeStartMode}
                    topMargin={welcomeStartMode === null ? 12 : 0}
                    biomeChoice={biomeChoice}
                    onStartSession={onStartSession}
                    selectedVehicle={selectedVehicle}
                    pvpLobbyBusy={pvpLobbyBusy}
                    pvpLobbyError={pvpLobbyError}
                    onCreatePvp={onPvpCreateRoom}
                    onCreatePve={onPveCreateRoom}
                    onQuickPlay={onPvpQuickPlay}
                    onJoinRoom={onJoinRoomFromList}
                    goToPlaza={goToPlaza}
                    plazaButtonLabel="Tutorial plaza"
                  />
                </div>
              ) : (
              <>
                {welcomeStartMode === null ? (
                  <div style={{ ...welcomeIntroFlat, marginBottom: 14 }}>
                    <WelcomePitchBlurb />
                    <div
                      style={{
                        margin: "10px 0 0",
                        fontSize: 11,
                        lineHeight: 1.4,
                        color: hudColors.muted,
                        paddingTop: 10,
                        borderTop: "1px dashed rgba(0, 114, 188, 0.14)",
                      }}
                    >
                      Tap <strong style={{ color: hudColors.value }}>i</strong>{" "}
                      for full rules — or{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setGameConfigOpen(true);
                          setNewSessionStep(0);
                        }}
                        style={{
                          ...linkButtonStyle,
                          display: "inline",
                          fontSize: 11,
                        }}
                      >
                        change game config
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
              )
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
                    desert, forest, snow, sea, and ice independently for each
                    battle; a fixed choice uses that biome for every battle.
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
                        { id: "sea" as const, label: "Sea" },
                        { id: "ice" as const, label: "Ice" },
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
                      const unlocked = isVehicleUnlocked(
                        stats,
                        v.id,
                        shopInventory.ownedVehicleIds
                      );
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
                                {lockedVehicleSelectionHint(
                                  v.id,
                                  stats,
                                  shopInventory.ownedVehicleIds
                                )}
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
                    click on a shot (while not charging). Your saved charges (this
                    device): strength{" "}
                    <strong style={{ color: hudColors.value }}>
                      {shopInventory.strengthCharges}
                    </strong>
                    , no-bounce{" "}
                    <strong style={{ color: hudColors.value }}>
                      {shopInventory.noBounceCharges}
                    </strong>
                    , no-wind{" "}
                    <strong style={{ color: hudColors.value }}>
                      {shopInventory.noWindCharges}
                    </strong>
                    .
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
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 11,
                      lineHeight: 1.45,
                      color: hudColors.muted,
                    }}
                  >
                    Trajectory guideline (red dashed arc) is a separate setting:
                    open <strong style={{ color: hudColors.value }}>Menu</strong>{" "}
                    → <strong style={{ color: hudColors.value }}>Game Config</strong>{" "}
                    after you start.
                  </p>
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

            {showStandardWarPick ? (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  marginTop: 8,
                }}
              >
                <WelcomeModeFlow
                  mode={welcomeStartMode}
                  onModeChange={setWelcomeStartMode}
                  topMargin={welcomeStartMode === null ? 12 : 0}
                  biomeChoice={biomeChoice}
                  onStartSession={onStartSession}
                  selectedVehicle={selectedVehicle}
                  pvpLobbyBusy={pvpLobbyBusy}
                  pvpLobbyError={pvpLobbyError}
                  onCreatePvp={onPvpCreateRoom}
                  onCreatePve={onPveCreateRoom}
                  onQuickPlay={onPvpQuickPlay}
                  onJoinRoom={onJoinRoomFromList}
                  goToPlaza={goToPlaza}
                  plazaButtonLabel="Go to plaza"
                />
              </div>
            ) : null}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
