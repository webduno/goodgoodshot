"use client";

import { ToastNotif } from "@/components/ToastNotif";
import { usePlayerStats } from "@/components/PlayerStatsProvider";
import { CourseMapModal } from "@/components/game/cube/modals/CourseMapModal";
import { FinishGameModal } from "@/components/game/cube/modals/FinishGameModal";
import { GuidelineInfoModal } from "@/components/game/cube/modals/GuidelineInfoModal";
import { HelpModal } from "@/components/game/cube/modals/HelpModal";
import { ProfileModal } from "@/components/game/cube/modals/ProfileModal";
import { SessionStatsModal } from "@/components/game/cube/modals/SessionStatsModal";
import { SessionEndModal } from "@/components/game/cube/modals/SessionEndModal";
import { StartGameModal } from "@/components/game/cube/modals/StartGameModal";
import { AimHud } from "@/components/game/cube/hud/AimHud";
import { AimPadHud } from "@/components/game/cube/hud/AimPadHud";
import { PowerupSlotRow } from "@/components/game/cube/hud/PowerupSlotRow";
import { GuidelinePreviewPowerSlider } from "@/components/game/cube/hud/GuidelinePreviewPowerSlider";
import { FirePowerVerticalHud, ShotHud } from "@/components/game/cube/hud/ShotHud";
import { MinimapFlyoutHud } from "@/components/game/cube/hud/MinimapFlyoutHud";
import { StatsHud } from "@/components/game/cube/hud/StatsHud";
import { WindHud } from "@/components/game/cube/hud/WindHud";
import { InitialFieldGround } from "@/components/game/cube/meshes/InitialFieldGround";
import { IslandBushes } from "@/components/game/cube/meshes/IslandBushes";
import { IslandMiniVillage } from "@/components/game/cube/meshes/IslandMiniVillage";
import { IslandTrees } from "@/components/game/cube/meshes/IslandTrees";
import { SkyClouds } from "@/components/game/cube/meshes/SkyClouds";
import { SkySun } from "@/components/game/cube/meshes/SkySun";
import { RetroTvPostFx } from "@/components/game/cube/effects/RetroTvPostFx";
import { SceneContent } from "@/components/game/cube/SceneContent";
import {
  TeleportOrbitRig,
} from "@/components/game/cube/TeleportOrbitRig";
import { StaticSceneLights } from "@/components/game/cube/StaticSceneLights";
import {
  goldChipButtonStyle,
  goldIconButtonStyle,
  hudBottomPanel,
  hudColors,
  hudFont,
  hudMiniPanel,
  HUD_POWERUP_MENU_MAX_WIDTH_PX,
  hudRoundFireButtonStyle,
  hudRoundPowerupButtonStyle,
} from "@/components/gameHudStyles";
import {
  DEFAULT_PLAYER_VEHICLE,
  halfClicksForStrengthBarRef,
  maxClicksForStrengthBarRef,
  vehicleShotCooldownMs,
} from "@/components/playerVehicleConfig";
import { resolvePlayerVehicle } from "@/lib/game/vehicleUnlock";
import { onCanvasCreated } from "@/lib/game/canvas";
import {
  burstMessengerKillConfetti,
  burstPowerupBuyConfetti,
  burstPowerupUseConfetti,
  burstShotGreyConfetti,
} from "@/lib/game/confetti";
import {
  AIM_PITCH_MAX_RAD,
  AIM_PITCH_STEP_RAD,
  AIM_YAW_QUARTER_TURN_RAD,
  AIM_YAW_STEP_RAD,
  SKY_GRADIENT_CSS,
  INITIAL_POWERUP_CHARGES,
} from "@/lib/game/constants";
import {
  createInitialGameState,
  gameReducer,
} from "@/lib/game/gameState";
import {
  clearSessionBattleMaps,
  generateSessionBattleMaps,
  getSessionBattleMapForSession,
  saveSessionBattleMaps,
  type SessionBiomeChoice,
} from "@/lib/game/sessionBattleMaps";
import {
  clearPlaySession,
  defaultPlaySession,
  loadActivePlaySession,
  loadPlaySession,
  savePlaySession,
  type PlaySession,
  type SessionBattleCount,
} from "@/lib/game/playSession";
import {
  loadAimControlMode,
  persistAimControlMode,
  type AimControlMode,
} from "@/lib/game/aimControlSettings";
import {
  loadRetroTvEnabled,
  persistRetroTvEnabled,
} from "@/lib/game/retroTvSettings";
import {
  bodyYawQuarterSnappedFromWorldAim,
  clampAimPitchOffsetRad,
  clampYawDeltaToPadArc,
  hudAimYawToWorldYawRad,
  snapAimAngleRad,
  wrapYawRad,
} from "@/lib/game/math";
import { stepWind } from "@/lib/game/wind";
import { parCoinCountForIslands } from "@/lib/game/path";
import {
  INITIAL_LANE_ORIGIN,
  type PowerupSlotId,
  type Vec3,
} from "@/lib/game/types";
import { Canvas } from "@react-three/fiber";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

export default function CubeScene() {
  const { recordHoleCompleted, recordGoldCoin, spendGoldCoin, stats } =
    usePlayerStats();
  const searchParams = useSearchParams();
  const vehicleParam = searchParams.get("vehicle");
  const playerVehicle = useMemo(
    () => resolvePlayerVehicle(vehicleParam, stats),
    [vehicleParam, stats]
  );

  const [game, dispatch] = useReducer(
    gameReducer,
    undefined,
    createInitialGameState
  );

  const goalCenter: Vec3 = [
    game.goalWorldX,
    INITIAL_LANE_ORIGIN[1],
    game.goalWorldZ,
  ];

  const islands = game.islands;
  const holePar = useMemo(
    () => parCoinCountForIslands(islands, INITIAL_LANE_ORIGIN[1]),
    [islands]
  );
  const gameSpawnRef = useRef<Vec3>(game.spawnCenter);
  gameSpawnRef.current = game.spawnCenter;
  const spawnBeforeShotRef = useRef<Vec3>(game.spawnCenter);

  const [aimYawRad, setAimYawRad] = useState(0);
  /** Center of the aim pad’s 90° arc (multiples of 90°); pad adjusts ±45° around this. */
  const [aimSideYawRad, setAimSideYawRad] = useState(0);
  const [aimPitchOffsetRad, setAimPitchOffsetRad] = useState(0);
  const aimYawRef = useRef(0);
  aimYawRef.current = aimYawRad;
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [shotInFlight, setShotInFlight] = useState(false);
  const [followBallCamera, setFollowBallCamera] = useState(false);
  const ballFollowStateRef = useRef({
    pos: new THREE.Vector3(),
    valid: false,
  });
  const [sessionShots, setSessionShots] = useState(0);
  const [playSession, setPlaySession] = useState<PlaySession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  /** First hole of the session: show trajectory guideline on every shot without spending charges. */
  const sessionFirstBattleGuideline = useMemo(
    () =>
      playSession !== null &&
      playSession.battlesWon + playSession.battlesLost === 0,
    [playSession]
  );

  useEffect(() => {
    setPlaySession(loadActivePlaySession());
    setSessionReady(true);
  }, []);

  const sessionMapHydrationKeyRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!sessionReady) return;
    const session = playSession;
    const key = session
      ? `${session.startedAtMs}-${session.targetBattles}-${session.battlesWon + session.battlesLost}`
      : "none";
    if (sessionMapHydrationKeyRef.current === key) return;
    sessionMapHydrationKeyRef.current = key;

    if (!session) return;
    const mapped = getSessionBattleMapForSession(session);
    if (mapped) {
      dispatch({ type: "REPLACE_GAME_STATE", state: mapped });
    }
  }, [sessionReady, playSession]);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showSessionEndModal, setShowSessionEndModal] = useState(false);
  const [sessionEndTotalStrokes, setSessionEndTotalStrokes] = useState(0);
  const [sessionEndTargetBattles, setSessionEndTargetBattles] =
    useState<SessionBattleCount>(3);
  const [sessionEndWon, setSessionEndWon] = useState(true);
  const [sessionEndBattlesWon, setSessionEndBattlesWon] = useState(0);
  const [sessionEndBattlesLost, setSessionEndBattlesLost] = useState(0);
  const [finishBattleWon, setFinishBattleWon] = useState(true);
  const [finishPar, setFinishPar] = useState(0);
  const [finishLossReason, setFinishLossReason] = useState<"par" | "enemy">(
    "par"
  );
  const [showStartGameModal, setShowStartGameModal] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [retroTvEnabled, setRetroTvEnabled] = useState(false);
  const [aimControlMode, setAimControlMode] = useState<AimControlMode>("pad");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSessionStatsModal, setShowSessionStatsModal] = useState(false);
  const [showGuidelineInfoModal, setShowGuidelineInfoModal] = useState(false);
  const [showCourseMapModal, setShowCourseMapModal] = useState(false);

  useEffect(() => {
    setRetroTvEnabled(loadRetroTvEnabled());
  }, []);

  useEffect(() => {
    setAimControlMode(loadAimControlMode());
  }, []);

  useEffect(() => {
    if (showFinishModal || showStartGameModal || showSessionEndModal) {
      setShowCourseMapModal(false);
    }
  }, [showFinishModal, showStartGameModal, showSessionEndModal]);

  const [showPowerupMenu, setShowPowerupMenu] = useState(false);
  const [hudToastToken, setHudToastToken] = useState(0);
  const [hudToastMessage, setHudToastMessage] = useState("");
  const [hudToastAccent, setHudToastAccent] = useState<
    "strength" | "noBounce" | "nowind" | "guideline" | undefined
  >(undefined);
  const fireHeldRef = useRef<((held: boolean) => void) | null>(null);

  const pushHudToast = useCallback(
    (
      message: string,
      accent?: "strength" | "noBounce" | "nowind" | "guideline"
    ) => {
      setHudToastMessage(message);
      setHudToastAccent(accent);
      setHudToastToken((t) => t + 1);
    },
    []
  );

  const onRetroTvChange = useCallback((next: boolean) => {
    setRetroTvEnabled(next);
    persistRetroTvEnabled(next);
  }, []);

  const onAimControlModeChange = useCallback((next: AimControlMode) => {
    if (next === "pad") {
      const prev = aimYawRef.current;
      const side = bodyYawQuarterSnappedFromWorldAim(prev);
      const local = clampYawDeltaToPadArc(wrapYawRad(prev - side));
      setAimSideYawRad(side);
      setAimYawRad(wrapYawRad(side + snapAimAngleRad(local)));
    }
    setAimControlMode(next);
    persistAimControlMode(next);
  }, []);

  const prevWindMagRef = useRef<number | null>(null);
  const maybeWindToast = useCallback(
    (wx: number, wz: number, resetHole: boolean) => {
      if (resetHole) {
        prevWindMagRef.current = null;
      }
      const mag = Math.hypot(wx, wz);
      const prev = prevWindMagRef.current;
      if (mag > 2 && (prev === null || prev <= 2)) {
        pushHudToast("is getting windy");
      }
      prevWindMagRef.current = mag;
    },
    [pushHudToast]
  );

  const onContinueSession = useCallback(() => {
    setShowStartGameModal(false);
    pushHudToast(`Hold to shoot to start`);
  }, [pushHudToast]);

  const onStartNewSession = useCallback(
    (battleCount: SessionBattleCount, biomeChoice: SessionBiomeChoice) => {
      clearSessionBattleMaps();
      const next = defaultPlaySession(battleCount);
      const maps = generateSessionBattleMaps(battleCount, biomeChoice);
      saveSessionBattleMaps({
        startedAtMs: next.startedAtMs,
        targetBattles: battleCount,
        maps,
      });
      savePlaySession(next);
      setPlaySession(next);
      dispatch({ type: "REPLACE_GAME_STATE", state: maps[0] });
      setShowStartGameModal(false);
      pushHudToast(`Hold to shoot to start`);
    },
    [pushHudToast]
  );
  const [chargeHud, setChargeHud] = useState<{
    remainingMs: number;
    clicks: number;
  } | null>(null);
  const [guidelinePreviewClicks, setGuidelinePreviewClicks] = useState(() =>
    halfClicksForStrengthBarRef(DEFAULT_PLAYER_VEHICLE)
  );
  const [guidelineReadyConfirmed, setGuidelineReadyConfirmed] = useState(false);
  const prevPurchasedGuidelineRef = useRef(false);
  const prevShotInFlightRef = useRef(shotInFlight);
  const [, setHudTick] = useState(0);

  const gameRef = useRef(game);
  gameRef.current = game;
  const sessionShotsRef = useRef(sessionShots);
  sessionShotsRef.current = sessionShots;
  const strengthUsesRoundRef = useRef(0);
  const noBounceUsesRoundRef = useRef(0);
  const waterPenaltiesRoundRef = useRef(0);

  const collectedCoinKeysRef = useRef(new Set<string>());
  const [coinRenderTick, setCoinRenderTick] = useState(0);

  const powerupStackRef = useRef(0);
  const noBounceRef = useRef(false);
  const noWindRef = useRef(false);
  const windRef = useRef({ x: 0, z: 0 });
  /** Kept in sync with state each render for reliable guards in handlers. */
  const strengthChargesRef = useRef(INITIAL_POWERUP_CHARGES);
  const noBounceChargesRef = useRef(INITIAL_POWERUP_CHARGES);
  const noWindChargesRef = useRef(INITIAL_POWERUP_CHARGES);
  const guidelineChargesRef = useRef(INITIAL_POWERUP_CHARGES);
  const [powerupStackCount, setPowerupStackCount] = useState(0);
  const [noBounceActive, setNoBounceActive] = useState(false);
  const [noWindActive, setNoWindActive] = useState(false);
  const [guidelineActiveNextShot, setGuidelineActiveNextShot] = useState(false);
  const [windHud, setWindHud] = useState({ x: 0, z: 0 });
  const [strengthCharges, setStrengthCharges] = useState(INITIAL_POWERUP_CHARGES);
  const [noBounceCharges, setNoBounceCharges] = useState(INITIAL_POWERUP_CHARGES);
  const [noWindCharges, setNoWindCharges] = useState(INITIAL_POWERUP_CHARGES);
  const [guidelineCharges, setGuidelineCharges] = useState(
    INITIAL_POWERUP_CHARGES
  );
  strengthChargesRef.current = strengthCharges;
  noBounceChargesRef.current = noBounceCharges;
  noWindChargesRef.current = noWindCharges;
  guidelineChargesRef.current = guidelineCharges;
  const inCooldown = cooldownUntil !== null;

  useEffect(() => {
    const m = maxClicksForStrengthBarRef(playerVehicle);
    setGuidelinePreviewClicks((c) => Math.min(m, Math.max(1, c)));
  }, [playerVehicle]);

  useEffect(() => {
    if (guidelineActiveNextShot && !prevPurchasedGuidelineRef.current) {
      setGuidelinePreviewClicks(halfClicksForStrengthBarRef(playerVehicle));
      setGuidelineReadyConfirmed(false);
    }
    prevPurchasedGuidelineRef.current = guidelineActiveNextShot;
  }, [guidelineActiveNextShot, playerVehicle]);

  useEffect(() => {
    if (prevShotInFlightRef.current && !shotInFlight) {
      setGuidelineReadyConfirmed(false);
    }
    prevShotInFlightRef.current = shotInFlight;
  }, [shotInFlight]);

  const guidelineArmed =
    guidelineActiveNextShot || sessionFirstBattleGuideline;
  const guidelineAdjusting =
    guidelineArmed &&
    !guidelineReadyConfirmed &&
    chargeHud === null &&
    !shotInFlight;

  useEffect(() => {
    windRef.current = stepWind();
    const w = windRef.current;
    maybeWindToast(w.x, w.z, true);
    setWindHud({ x: w.x, z: w.z });
  }, [game.goalWorldX, game.goalWorldZ, maybeWindToast]);

  useEffect(() => {
    collectedCoinKeysRef.current.clear();
    setCoinRenderTick((t) => t + 1);
  }, [game.goalWorldX, game.goalWorldZ]);

  useEffect(() => {
    setAimPitchOffsetRad(0);
  }, [playerVehicle.id]);

  const onCoinCollected = useCallback(
    (key: string) => {
      if (collectedCoinKeysRef.current.has(key)) return;
      collectedCoinKeysRef.current.add(key);
      recordGoldCoin();
      setCoinRenderTick((t) => t + 1);
    },
    [recordGoldCoin]
  );

  const onEnemyKillReward = useCallback(() => {
    recordGoldCoin();
    recordGoldCoin();
    recordGoldCoin();
    burstMessengerKillConfetti();
    pushHudToast("Messenger down! +3 coins");
  }, [recordGoldCoin, pushHudToast]);

  const getPowerupMultiplier = useCallback(
    () => Math.pow(2, powerupStackRef.current),
    []
  );

  const getNoBounceActive = useCallback(() => noBounceRef.current, []);

  const resetPowerupStack = useCallback(() => {
    powerupStackRef.current = 0;
    setPowerupStackCount(0);
    noBounceRef.current = false;
    setNoBounceActive(false);
    noWindRef.current = false;
    setNoWindActive(false);
  }, []);

  const onGuidelineConsumedForShot = useCallback(() => {
    setGuidelineActiveNextShot((prev) => (prev ? false : prev));
  }, []);

  const prepareShotWind = useCallback(() => {
    const useNoWind = noWindRef.current;
    const ax = useNoWind ? 0 : windRef.current.x;
    const az = useNoWind ? 0 : windRef.current.z;
    windRef.current = stepWind();
    /** HUD stays on this shot's wind until onProjectileEnd; windRef holds the next shot. */
    return { ax, az };
  }, []);

  const activatePowerup = useCallback(
    (slotId: PowerupSlotId) => {
      if (shotInFlight || showFinishModal) return;

      if (slotId === "strength") {
        if (strengthChargesRef.current <= 0) return;
        strengthUsesRoundRef.current += 1;
        powerupStackRef.current += 1;
        setPowerupStackCount(powerupStackRef.current);
        setStrengthCharges((c) => (c <= 0 ? c : c - 1));
        const mult = Math.pow(2, powerupStackRef.current);
        pushHudToast(`"Strength" used (×${mult})`, "strength");
        burstPowerupUseConfetti("strength");
        return;
      }

      if (slotId === "noBounce") {
        if (noBounceRef.current) return;
        if (noBounceChargesRef.current <= 0) return;
        noBounceUsesRoundRef.current += 1;
        noBounceRef.current = true;
        setNoBounceActive(true);
        setNoBounceCharges((c) => (c <= 0 ? c : c - 1));
        pushHudToast(`"No bounce" used`, "noBounce");
        burstPowerupUseConfetti("noBounce");
        return;
      }

      if (slotId === "nowind") {
        if (noWindRef.current) return;
        if (noWindChargesRef.current <= 0) return;
        noWindRef.current = true;
        setNoWindActive(true);
        setNoWindCharges((c) => (c <= 0 ? c : c - 1));
        pushHudToast(`"No wind" used`, "nowind");
        burstPowerupUseConfetti("nowind");
        return;
      }

      if (slotId === "guideline") {
        if (guidelineActiveNextShot || sessionFirstBattleGuideline) return;
        if (guidelineChargesRef.current <= 0) return;
        setGuidelineCharges((c) => (c <= 0 ? c : c - 1));
        setGuidelineActiveNextShot(true);
        pushHudToast(`"Guideline" used`, "guideline");
        burstPowerupUseConfetti("guideline");
      }
    },
    [
      guidelineActiveNextShot,
      sessionFirstBattleGuideline,
      pushHudToast,
      shotInFlight,
      showFinishModal,
    ]
  );

  const buyPowerupCharge = useCallback(
    (slotId: PowerupSlotId) => {
      if (
        slotId !== "strength" &&
        slotId !== "noBounce" &&
        slotId !== "nowind" &&
        slotId !== "guideline"
      ) {
        return;
      }
      if (!spendGoldCoin()) {
        pushHudToast("Need 1 coin");
        return;
      }
      if (slotId === "strength") {
        setStrengthCharges((c) => c + 1);
        burstPowerupBuyConfetti("strength");
      } else if (slotId === "noBounce") {
        setNoBounceCharges((c) => c + 1);
        burstPowerupBuyConfetti("noBounce");
      } else if (slotId === "nowind") {
        setNoWindCharges((c) => c + 1);
        burstPowerupBuyConfetti("nowind");
      } else {
        setGuidelineCharges((c) => c + 1);
        burstPowerupBuyConfetti("guideline");
      }
    },
    [spendGoldCoin, pushHudToast]
  );

  const onChargeHudUpdate = useCallback(
    (next: { remainingMs: number; clicks: number } | null) => {
      setChargeHud(next);
    },
    []
  );

  const onChargeWindowStart = useCallback(() => {
    pushHudToast("Hold to add power");
  }, [pushHudToast]);

  const bindFireHeld = useCallback((handler: ((held: boolean) => void) | null) => {
    fireHeldRef.current = handler;
  }, []);

  const onShootStart = useCallback(() => {
    setShotInFlight(true);
    spawnBeforeShotRef.current = gameSpawnRef.current;
    setSessionShots((n) => n + 1);
    burstShotGreyConfetti();
  }, []);

  const onProjectileEnd = useCallback(
    (outcome: "hit" | "miss" | "penalty" | "enemy_loss", landing?: Vec3) => {
      setShotInFlight(false);
      setWindHud({ x: windRef.current.x, z: windRef.current.z });
      maybeWindToast(windRef.current.x, windRef.current.z, false);
      if (outcome === "penalty") {
        waterPenaltiesRoundRef.current += 1;
        pushHudToast("Void death");
        dispatch({
          type: "PROJECTILE_END",
          outcome: "penalty",
          revertSpawn: [...spawnBeforeShotRef.current] as Vec3,
        });
      } else {
        if (outcome === "hit" || outcome === "enemy_loss") {
          const g = gameRef.current;
          const par = parCoinCountForIslands(
            g.islands,
            INITIAL_LANE_ORIGIN[1]
          );
          const shots = sessionShotsRef.current;
          const battleWon =
            outcome === "hit" && shots <= par;
          recordHoleCompleted({
            vehicleId: playerVehicle.id,
            shots,
            ponds: g.ponds,
            goalWorldX: g.goalWorldX,
            goalWorldZ: g.goalWorldZ,
            strengthUses: strengthUsesRoundRef.current,
            noBounceUses: noBounceUsesRoundRef.current,
            waterPenaltiesThisRound: waterPenaltiesRoundRef.current,
            battleOutcome: battleWon ? "win" : "loss",
          });
          const session = loadPlaySession();
          if (session) {
            const nextWon = session.battlesWon + (battleWon ? 1 : 0);
            const nextLost = session.battlesLost + (battleWon ? 0 : 1);
            const nextTotal = session.totalStrokes + shots;
            const updated: PlaySession = {
              ...session,
              battlesWon: nextWon,
              battlesLost: nextLost,
              totalStrokes: nextTotal,
            };
            savePlaySession(updated);
            setPlaySession(updated);
            const roundsDone = nextWon + nextLost;
            if (roundsDone >= session.targetBattles) {
              setSessionEndTotalStrokes(nextTotal);
              setSessionEndTargetBattles(session.targetBattles);
              setSessionEndWon(nextWon >= nextLost);
              setSessionEndBattlesWon(nextWon);
              setSessionEndBattlesLost(nextLost);
              dispatch({
                type: "PROJECTILE_END",
                outcome,
                landing,
              });
              setShowSessionEndModal(true);
              return;
            }
          }
          setFinishBattleWon(battleWon);
          setFinishPar(par);
          setFinishLossReason(outcome === "enemy_loss" ? "enemy" : "par");
        }
        dispatch({
          type: "PROJECTILE_END",
          outcome,
          landing,
        });
      }
      if (outcome === "hit" || outcome === "enemy_loss") {
        setShowFinishModal(true);
        return;
      }
      setCooldownUntil(performance.now() + vehicleShotCooldownMs(playerVehicle));
    },
    [maybeWindToast, playerVehicle, pushHudToast, recordHoleCompleted]
  );

  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => {
      setHudTick((t) => t + 1);
      if (Date.now() >= cooldownUntil) {
        setCooldownUntil(null);
      }
    }, 100);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  useEffect(() => {
    if (showFinishModal || showSessionEndModal) {
      setShowHelpModal(false);
      setShowProfileModal(false);
    }
  }, [showFinishModal, showSessionEndModal]);

  useEffect(() => {
    if (!showHelpModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowHelpModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHelpModal]);

  useEffect(() => {
    if (chargeHud !== null || shotInFlight) setShowPowerupMenu(false);
  }, [chargeHud, shotInFlight]);

  useEffect(() => {
    if (!showPowerupMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPowerupMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPowerupMenu]);

  useEffect(() => {
    if (!showProfileModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowProfileModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showProfileModal]);

  useEffect(() => {
    if (
      shotInFlight ||
      showFinishModal ||
      showStartGameModal ||
      showSessionEndModal ||
      showHelpModal ||
      showProfileModal ||
      showGuidelineInfoModal
    ) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      const k = e.key;
      const powerupFromKey =
        k === "1" || e.code === "Numpad1"
          ? ("strength" as const)
          : k === "2" || e.code === "Numpad2"
            ? ("noBounce" as const)
            : k === "3" || e.code === "Numpad3"
              ? ("nowind" as const)
              : k === "4" || e.code === "Numpad4"
                ? ("guideline" as const)
                : null;
      if (powerupFromKey !== null) {
        e.preventDefault();
        activatePowerup(powerupFromKey);
        return;
      }
      if (k === " ") {
        if (
          shotInFlight ||
          showFinishModal ||
          showStartGameModal ||
          showSessionEndModal ||
          inCooldown
        ) {
          return;
        }
        if (e.repeat) return;
        e.preventDefault();
        if (guidelineAdjusting) {
          setGuidelineReadyConfirmed(true);
          return;
        }
        fireHeldRef.current?.(true);
        return;
      }
      if (chargeHud !== null) {
        return;
      }
      if (k === "w" || k === "W" || k === "ArrowUp") {
        setAimPitchOffsetRad((p) =>
          clampAimPitchOffsetRad(p + AIM_PITCH_STEP_RAD)
        );
        if (k === "ArrowUp") e.preventDefault();
        return;
      }
      if (k === "s" || k === "S" || k === "ArrowDown") {
        setAimPitchOffsetRad((p) =>
          clampAimPitchOffsetRad(p - AIM_PITCH_STEP_RAD)
        );
        if (k === "ArrowDown") e.preventDefault();
        return;
      }
      if (k === "a" || k === "A" || k === "ArrowLeft") {
        setAimYawRad((a) => {
          const next = wrapYawRad(a - AIM_YAW_STEP_RAD);
          setAimSideYawRad(
            bodyYawQuarterSnappedFromWorldAim(hudAimYawToWorldYawRad(next))
          );
          return next;
        });
        if (k === "ArrowLeft") e.preventDefault();
        return;
      }
      if (k === "d" || k === "D" || k === "ArrowRight") {
        setAimYawRad((a) => {
          const next = wrapYawRad(a + AIM_YAW_STEP_RAD);
          setAimSideYawRad(
            bodyYawQuarterSnappedFromWorldAim(hudAimYawToWorldYawRad(next))
          );
          return next;
        });
        if (k === "ArrowRight") e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    shotInFlight,
    showFinishModal,
    showStartGameModal,
    showSessionEndModal,
    showHelpModal,
    showProfileModal,
    showGuidelineInfoModal,
    inCooldown,
    chargeHud,
    activatePowerup,
    guidelineAdjusting,
  ]);

  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      fireHeldRef.current?.(false);
    };
    window.addEventListener("keyup", onKeyUp);
    return () => window.removeEventListener("keyup", onKeyUp);
  }, []);

  const powerupMenuLocked = chargeHud !== null || shotInFlight;
  const powerupMenuOpen = showPowerupMenu && !powerupMenuLocked;

  const remainingCooldownMs =
    cooldownUntil !== null ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const inCooldownActive =
    cooldownUntil !== null && remainingCooldownMs > 0;
  /** Match `ShotHud`: only show the glass panel when it has content (idle was an empty full-width strip). */
  const showShotHudPanel =
    (chargeHud !== null && !shotInFlight) ||
    (inCooldownActive && !shotInFlight && chargeHud === null);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: SKY_GRADIENT_CSS,
      }}
    >
      <Canvas
        style={{ width: "100%", height: "100%", display: "block" }}
        onCreated={onCanvasCreated}
        gl={{ antialias: true, alpha: false, logarithmicDepthBuffer: true }}
        dpr={[1, 2]}
        shadows="soft"
      >
        <StaticSceneLights />
        <SkyClouds />
        <SkySun />
        <TeleportOrbitRig
          gameSpawn={game.spawnCenter}
          followBallActive={followBallCamera}
          ballFollowStateRef={ballFollowStateRef}
        >
          <SceneContent
            spawnCenter={game.spawnCenter}
            goalCenter={goalCenter}
            islands={islands}
            aimYawRad={aimYawRad}
            aimPitchOffsetRad={aimPitchOffsetRad}
            cooldownUntil={cooldownUntil}
            roundLocked={
              showFinishModal || showStartGameModal || showSessionEndModal
            }
            shotInFlight={shotInFlight}
            vehicle={playerVehicle}
            onChargeHudUpdate={onChargeHudUpdate}
            onShootStart={onShootStart}
            onProjectileEnd={onProjectileEnd}
            getPowerupMultiplier={getPowerupMultiplier}
            getNoBounceActive={getNoBounceActive}
            prepareShotWind={prepareShotWind}
            resetPowerupStack={resetPowerupStack}
            onChargeWindowStart={onChargeWindowStart}
            collectedCoinKeysRef={collectedCoinKeysRef}
            coinRenderTick={coinRenderTick}
            onCoinCollected={onCoinCollected}
            onBindFireHeld={bindFireHeld}
            isCharging={chargeHud !== null}
            powerupStackCount={powerupStackCount}
            noBounceActive={noBounceActive}
            noWindActive={noWindActive}
            guidelineActiveNextShot={
              guidelineActiveNextShot || sessionFirstBattleGuideline
            }
            onGuidelineConsumedForShot={onGuidelineConsumedForShot}
            chargeHudForGuideline={chargeHud}
            guidelinePreviewClicks={guidelinePreviewClicks}
            guidelineFireBlocked={guidelineAdjusting}
            biome={game.biome}
            onTerrainCoordsClick={(coords) =>
            {
              // pushHudToast(
              //   `lat ${coords.lat.toFixed(4)}, lng ${coords.lng.toFixed(4)}`
              // )
            }
            }
            onGuidelinePillClick={() => setShowGuidelineInfoModal(true)}
            ballFollowStateRef={ballFollowStateRef}
            onEnemyKillReward={onEnemyKillReward}
          />
        </TeleportOrbitRig>
        {/** Draw after scene content so the green turf sits on top of `TerrainTextured`. */}
        <InitialFieldGround islands={islands} biome={game.biome} />
        <IslandMiniVillage miniVillage={game.miniVillage} />
        <IslandBushes islands={islands} biome={game.biome} />
        <IslandTrees islands={islands} biome={game.biome} />
        <RetroTvPostFx enabled={retroTvEnabled} />
      </Canvas>
      <ToastNotif
        showToken={hudToastToken}
        message={hudToastMessage}
        top={16}
        accent={hudToastAccent}
      />
      {!showStartGameModal && !showSessionEndModal && (
        <StatsHud
          holePar={holePar}
          sessionShots={sessionShots}
          chargeHud={chargeHud}
          shotInFlight={shotInFlight}
          cooldownUntil={cooldownUntil}
          strengthCharges={strengthCharges}
          noBounceCharges={noBounceCharges}
          noWindCharges={noWindCharges}
          powerupStackCount={powerupStackCount}
          noBounceActive={noBounceActive}
          noWindActive={noWindActive}
          vehicle={playerVehicle}
          onScoreClick={() => setShowSessionStatsModal(true)}
        />
      )}
      {!showFinishModal && !showStartGameModal && !showSessionEndModal && (
        <>
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 42,
              display: "flex",
              gap: 8,
              /** Own compositing layer so mouse hit-testing stays above the WebGL canvas (desktop). */
              transform: "translateZ(0)",
            }}
          >
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => {
                setShowProfileModal(false);
                setShowHelpModal(true);
              }}
              style={goldChipButtonStyle()}
            >
              Menu
            </button>
            <button
              type="button"
              aria-label="Open profile"
              onClick={() => {
                setShowHelpModal(false);
                setShowProfileModal(true);
              }}
              style={goldChipButtonStyle()}
            >
              Profile
            </button>
          </div>
          <div
            style={{
              position: "absolute",
              top: 52,
              right: 12,
              zIndex: 42,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
              pointerEvents: "none",
              transform: "translateZ(0)",
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              <MinimapFlyoutHud
                islands={islands}
                mapModalOpen={showCourseMapModal}
                onOpenMap={() => setShowCourseMapModal(true)}
              />
            </div>
            <WindHud windHud={windHud} />
          </div>
        </>
      )}
      {!showFinishModal && !showStartGameModal && !showSessionEndModal && (
        <>
        <div
          className="hud-bottom-dock"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 12,
            padding: "0 6px 8px",
            boxSizing: "border-box",
            zIndex: 41,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          <div
            style={{
              position: "relative",
              pointerEvents: "auto",
              flexShrink: 0,
              alignSelf: "flex-end",
            }}
          >
            <button
              type="button"
              disabled={powerupMenuLocked}
              aria-expanded={powerupMenuOpen}
              aria-controls="powerup-precharge-panel"
              onClick={() => {
                if (powerupMenuLocked) return;
                setShowPowerupMenu((v) => !v);
              }}
              style={hudRoundPowerupButtonStyle(powerupMenuLocked)}
            >
                {powerupMenuOpen ? (
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      lineHeight: 1.05,
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    <span>Hide</span>
                    <span style={{ fontSize: 8, fontWeight: 600 }}>
                      power-ups
                    </span>
                  </span>
                ) : (
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      lineHeight: 1.05,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    <span>Power</span>
                    <span style={{ fontSize: 16 }}>-ups</span>
                  </span>
                )}
            </button>
            {/* {stats.totalGoldCoins >= 1 &&
              collectedCoinKeysRef.current.size > 0 &&
              !showPowerupMenu &&
              !powerupMenuLocked && (
                <div
                  aria-hidden
                  style={{
                    ...hudMiniPanel,
                    ...hudFont,
                    position: "absolute",
                    left: "50%",
                    bottom: "100%",
                    transform: "translateX(calc(-50% - 22px))",
                    marginBottom: 6,
                    zIndex: 51,
                    padding: "4px 9px",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    color: hudColors.value,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    textAlign: "center",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.55), 0 3px 10px rgba(0, 82, 130, 0.22)",
                  }}
                >
                  Spend coins here
                </div>
              )} */}
            {powerupMenuOpen && (
              <div
                id="powerup-precharge-panel"
                role="region"
                aria-label="Power-up slots"
                style={{
                  ...hudMiniPanel,
                  ...hudFont,
                  position: "absolute",
                  left: "50%",
                  bottom: "100%",
                  transform: "translateX(-50%)",
                  marginBottom: 8,
                  zIndex: 50,
                  padding: "5px 4px",
                  width: `min(92vw, ${HUD_POWERUP_MENU_MAX_WIDTH_PX}px)`,
                  maxWidth: `min(92vw, ${HUD_POWERUP_MENU_MAX_WIDTH_PX}px)`,
                  boxSizing: "border-box",
                  pointerEvents: "auto",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.55), 0 3px 10px rgba(0, 82, 130, 0.22), 0 -8px 28px rgba(0, 55, 95, 0.18)",
                }}
              >
                <PowerupSlotRow
                  strengthCharges={strengthCharges}
                  noBounceCharges={noBounceCharges}
                  noWindCharges={noWindCharges}
                  guidelineCharges={guidelineCharges}
                  canUseStrength={strengthCharges > 0}
                  canUseNoBounce={
                    noBounceCharges > 0 && !noBounceActive
                  }
                  canUseNoWind={noWindCharges > 0 && !noWindActive}
                  canUseGuideline={
                    guidelineCharges > 0 &&
                    !guidelineActiveNextShot &&
                    !sessionFirstBattleGuideline
                  }
                  canAffordBuy={stats.totalGoldCoins >= 1}
                  onPowerup={activatePowerup}
                  onBuyPowerupCharge={buyPowerupCharge}
                />
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              flex: "0 0 auto",
              width: "fit-content",
              maxWidth: "min(94vw, 340px)",
              pointerEvents: "auto",
            }}
          >
            {chargeHud === null &&
              (aimControlMode === "pad" ? (
                <AimPadHud
                  disabled={shotInFlight}
                  aimYawRad={aimYawRad}
                  aimPitchOffsetRad={aimPitchOffsetRad}
                  onAimChange={({ yawRad, pitchOffsetRad }) => {
                    setAimYawRad(yawRad);
                    setAimPitchOffsetRad(pitchOffsetRad);
                  }}
                  onSideRotate={(dir) => {
                    setAimSideYawRad((s) =>
                      wrapYawRad(s + dir * AIM_YAW_QUARTER_TURN_RAD)
                    );
                    setAimYawRad((a) =>
                      wrapYawRad(a + dir * AIM_YAW_QUARTER_TURN_RAD)
                    );
                  }}
                />
              ) : (
                <AimHud
                  disabled={shotInFlight}
                  onPitchMaxUp={() => setAimPitchOffsetRad(AIM_PITCH_MAX_RAD)}
                  onPitchUp={() =>
                    setAimPitchOffsetRad((p) =>
                      clampAimPitchOffsetRad(p + AIM_PITCH_STEP_RAD)
                    )
                  }
                  onPitchDown={() =>
                    setAimPitchOffsetRad((p) =>
                      clampAimPitchOffsetRad(p - AIM_PITCH_STEP_RAD)
                    )
                  }
                  onPitchMaxDown={() =>
                    setAimPitchOffsetRad(-AIM_PITCH_MAX_RAD)
                  }
                  onMinus90={() =>
                    setAimYawRad((a) =>
                      wrapYawRad(a - AIM_YAW_QUARTER_TURN_RAD)
                    )
                  }
                  onLeft={() =>
                    setAimYawRad((a) => wrapYawRad(a - AIM_YAW_STEP_RAD))
                  }
                  onRight={() =>
                    setAimYawRad((a) => wrapYawRad(a + AIM_YAW_STEP_RAD))
                  }
                  onPlus90={() =>
                    setAimYawRad((a) =>
                      wrapYawRad(a + AIM_YAW_QUARTER_TURN_RAD)
                    )
                  }
                />
              ))}
            {showShotHudPanel && (
              <div
                style={{
                  ...hudBottomPanel,
                  width: "fit-content",
                  maxWidth: "none",
                  boxSizing: "border-box",
                  alignSelf: "center",
                }}
              >
                <ShotHud
                  shotInFlight={shotInFlight}
                  cooldownUntil={cooldownUntil}
                  chargeHud={chargeHud}
                  vehicle={playerVehicle}
                />
              </div>
            )}
          </div>
          {!showFinishModal && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 6,
                flexShrink: 0,
                pointerEvents: "none",
              }}
            >
              {guidelineAdjusting && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    pointerEvents: "auto",
                  }}
                >
                  <button
                    type="button"
                    aria-label="Ready"
                    onClick={() => setGuidelineReadyConfirmed(true)}
                    disabled={
                      shotInFlight ||
                      showFinishModal ||
                      showStartGameModal ||
                      showSessionEndModal ||
                      inCooldown
                    }
                    style={hudRoundFireButtonStyle(
                      shotInFlight ||
                        showFinishModal ||
                        showStartGameModal ||
                        showSessionEndModal ||
                        inCooldown
                        ? "disabled"
                        : "guidelineReady"
                    )}
                  >
                    Ready
                  </button>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  gap: 8,
                  pointerEvents: "none",
                }}
              >
                <FirePowerVerticalHud
                  shotInFlight={shotInFlight}
                  chargeHud={chargeHud}
                  vehicle={playerVehicle}
                  powerupStackCount={powerupStackCount}
                />
                {guidelineAdjusting && (
                  <GuidelinePreviewPowerSlider
                    vehicle={playerVehicle}
                    clicks={guidelinePreviewClicks}
                    onClicksChange={setGuidelinePreviewClicks}
                  />
                )}
              </div>
              {!guidelineAdjusting && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  pointerEvents: "auto",
                }}
              >
                <button
                  type="button"
                  aria-label="Hold to shoot"
                  onPointerDown={(e) => {
                    const fireDisabled =
                      shotInFlight ||
                      showFinishModal ||
                      showStartGameModal ||
                      showSessionEndModal ||
                      inCooldown;
                    if (fireDisabled) return;
                    if (e.pointerType === "mouse" && e.button !== 0) return;
                    if (e.currentTarget instanceof HTMLElement) {
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                      } catch {
                        /* ignore */
                      }
                    }
                    fireHeldRef.current?.(true);
                  }}
                  onPointerUp={(e) => {
                    if (e.pointerType === "mouse" && e.button !== 0) return;
                    if (e.currentTarget instanceof HTMLElement) {
                      try {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      } catch {
                        /* ignore */
                      }
                    }
                    fireHeldRef.current?.(false);
                  }}
                  onPointerCancel={() => fireHeldRef.current?.(false)}
                  disabled={
                    shotInFlight ||
                    showFinishModal ||
                    showStartGameModal ||
                    showSessionEndModal ||
                    inCooldown
                  }
                  style={hudRoundFireButtonStyle(
                    shotInFlight ||
                      showFinishModal ||
                      showStartGameModal ||
                      showSessionEndModal ||
                      inCooldown
                      ? "disabled"
                      : chargeHud !== null
                        ? "charging"
                        : "ready"
                  )}
                >
                  {chargeHud === null ? (
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        lineHeight: 1.05,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>Hold</span>
                      <span>to shoot</span>
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        lineHeight: 1.05,
                        fontSize: 8,
                        fontWeight: 700,
                      }}
                    >
                      <span>Hold</span>
                      <span>+power</span>
                    </span>
                  )}
                </button>
              </div>
              )}
            </div>
          )}
        </div>
        <div
          style={{
            position: "absolute",
            right: 12,
            bottom: 12,
            zIndex: 41,
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            aria-label={
              followBallCamera
                ? "Turn off follow ball camera"
                : "Follow the ball while it is in the air"
            }
            aria-pressed={followBallCamera}
            onClick={() => setFollowBallCamera((v) => !v)}
            style={{
              ...goldIconButtonStyle(false),
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              ...(followBallCamera
                ? {
                    outline: "2px solid rgba(0, 174, 239, 0.95)",
                    outlineOffset: 2,
                  }
                : {}),
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="7" />
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
              <circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
        </>
      )}
      <StartGameModal
        open={showStartGameModal}
        sessionReady={sessionReady}
        session={playSession}
        onContinue={onContinueSession}
        onStartSession={onStartNewSession}
      />
      <FinishGameModal
        open={showFinishModal}
        sessionShots={sessionShots}
        par={finishPar}
        battleWon={finishBattleWon}
        lossReason={finishLossReason}
      />
      <SessionEndModal
        open={showSessionEndModal}
        totalStrokes={sessionEndTotalStrokes}
        targetBattles={sessionEndTargetBattles}
        sessionWon={sessionEndWon}
        battlesWon={sessionEndBattlesWon}
        battlesLost={sessionEndBattlesLost}
        onDone={() => {
          clearSessionBattleMaps();
          clearPlaySession();
          window.location.reload();
        }}
        onStartNewSession={(battleCount) => {
          setShowSessionEndModal(false);
          onStartNewSession(battleCount, "random");
        }}
      />
      <GuidelineInfoModal
        open={showGuidelineInfoModal}
        onClose={() => setShowGuidelineInfoModal(false)}
        onOpenPowerupMenu={() => setShowPowerupMenu(true)}
      />
      <HelpModal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        vehicle={playerVehicle}
        retroTvEnabled={retroTvEnabled}
        onRetroTvChange={onRetroTvChange}
        aimControlMode={aimControlMode}
        onAimControlModeChange={onAimControlModeChange}
      />
      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
      <SessionStatsModal
        open={showSessionStatsModal}
        onClose={() => setShowSessionStatsModal(false)}
        session={playSession}
        sessionShots={sessionShots}
        onEndWar={() => {
          clearSessionBattleMaps();
          clearPlaySession();
          window.location.reload();
        }}
      />
      <CourseMapModal
        open={showCourseMapModal}
        onClose={() => setShowCourseMapModal(false)}
        islands={islands}
        biome={game.biome}
        goalWorldX={game.goalWorldX}
        goalWorldZ={game.goalWorldZ}
      />
    </div>
  );
}
