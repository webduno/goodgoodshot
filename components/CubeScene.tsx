"use client";

import { ToastNotif } from "@/components/ToastNotif";
import { usePlayerStats } from "@/components/PlayerStatsProvider";
import { CourseMapModal } from "@/components/game/cube/modals/CourseMapModal";
import { FinishGameModal } from "@/components/game/cube/modals/FinishGameModal";
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
import {
  RendererStatsCollector,
  type RendererStatsSnapshot,
} from "@/components/game/cube/RendererStatsCollector";
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
import { usePlayerShopInventory } from "@/lib/shop/usePlayerShopInventory";
import { onCanvasCreated } from "@/lib/game/canvas";
import {
  burstCageBreakConfetti,
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
  CHARGE_HOLD_REPEAT_MS,
  SKY_GRADIENT_CSS,
} from "@/lib/game/constants";
import {
  createInitialGameState,
  gameReducer,
} from "@/lib/game/gameState";
import {
  clearSessionBattleMaps,
  generateSessionBattleMaps,
  getSessionBattleMapForSession,
  loadSessionBattleMaps,
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
  loadGuidelineEnabled,
  persistGuidelineEnabled,
} from "@/lib/game/guidelineSettings";
import {
  bodyYawQuarterSnappedFromWorldAim,
  clampAimPitchOffsetRad,
  clampYawDeltaToPadArc,
  hudAimYawToWorldYawRad,
  snapAimAngleRad,
  wrapYawRad,
} from "@/lib/game/math";
import { stepWind } from "@/lib/game/wind";
import { playSfx, SFX } from "@/lib/sfx/sfxPlayer";
import { parCoinCountForIslands } from "@/lib/game/path";
import { SESSION_SKIP_START_MODAL_KEY } from "@/lib/game/startWarSession";
import {
  INITIAL_LANE_ORIGIN,
  type PowerupSlotId,
  type Vec3,
} from "@/lib/game/types";
import { Canvas } from "@react-three/fiber";
import { useRouter, useSearchParams } from "next/navigation";
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
  const { recordHoleCompleted, recordGoldCoin, recordGoldCoins, spendGoldCoin, stats } =
    usePlayerStats();
  const {
    inventory: shopInventory,
    setStrengthCharges,
    setNoBounceCharges,
    setNoWindCharges,
  } = usePlayerShopInventory();
  const strengthCharges = shopInventory.strengthCharges;
  const noBounceCharges = shopInventory.noBounceCharges;
  const noWindCharges = shopInventory.noWindCharges;
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleParam = searchParams.get("vehicle");
  const playerVehicle = useMemo(
    () =>
      resolvePlayerVehicle(vehicleParam, stats, shopInventory.ownedVehicleIds),
    [vehicleParam, stats, shopInventory.ownedVehicleIds]
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
    () => parCoinCountForIslands(islands, INITIAL_LANE_ORIGIN[1], goalCenter),
    [islands, goalCenter]
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
  const [goalCagesBroken, setGoalCagesBroken] = useState(() => new Set<string>());
  const [cageEscapeNextShot, setCageEscapeNextShot] = useState(false);
  const [followBallCamera, setFollowBallCamera] = useState(true);
  const ballFollowStateRef = useRef({
    pos: new THREE.Vector3(),
    valid: false,
    vx: 0,
    vy: 0,
    vz: 0,
  });
  const rendererStatsRef = useRef<RendererStatsSnapshot | null>(null);
  const [sessionShots, setSessionShots] = useState(0);
  const [playSession, setPlaySession] = useState<PlaySession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  useEffect(() => {
    setPlaySession(loadActivePlaySession());
    setSessionReady(true);
  }, []);

  const sessionMapHydrationKeyRef = useRef<string | null>(null);
  /** Mid-war battle finished: session is saved but map advance waits for Continue. */
  const deferMapAdvanceRef = useRef(false);
  const pendingBattleFinishRef = useRef<{
    outcome: "hit" | "enemy_loss";
    landing?: Vec3;
  } | null>(null);

  useLayoutEffect(() => {
    if (!sessionReady) return;
    const session = playSession;
    const key = session
      ? `${session.startedAtMs}-${session.targetBattles}-${session.battlesWon + session.battlesLost}`
      : "none";
    if (sessionMapHydrationKeyRef.current === key) return;

    if (!session) {
      sessionMapHydrationKeyRef.current = key;
      return;
    }

    if (deferMapAdvanceRef.current) {
      sessionMapHydrationKeyRef.current = key;
      return;
    }

    sessionMapHydrationKeyRef.current = key;

    const mapped = getSessionBattleMapForSession(session);
    if (mapped) {
      dispatch({ type: "REPLACE_GAME_STATE", state: mapped });
    }
  }, [sessionReady, playSession]);

  const sessionWarMapsPayload = useMemo(() => {
    if (!playSession) return null;
    const payload = loadSessionBattleMaps();
    if (!payload) return null;
    if (
      payload.startedAtMs !== playSession.startedAtMs ||
      payload.targetBattles !== playSession.targetBattles
    ) {
      return null;
    }
    return payload;
  }, [playSession]);

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
  /** Gold coins granted for this battle win (war battle index: 1st → 1, 5th → 5). */
  const [finishBattleCoinsEarned, setFinishBattleCoinsEarned] = useState(0);
  const [showStartGameModal, setShowStartGameModal] = useState(true);
  const [enemyLossAnimating, setEnemyLossAnimating] = useState(false);
  useLayoutEffect(() => {
    if (!sessionReady) return;
    try {
      if (sessionStorage.getItem(SESSION_SKIP_START_MODAL_KEY) === "1") {
        sessionStorage.removeItem(SESSION_SKIP_START_MODAL_KEY);
        if (playSession) setShowStartGameModal(false);
      }
    } catch {
      /* ignore */
    }
  }, [sessionReady, playSession]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [retroTvEnabled, setRetroTvEnabled] = useState(false);
  const [guidelineEnabled, setGuidelineEnabled] = useState(true);
  const [aimControlMode, setAimControlMode] = useState<AimControlMode>("pad");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSessionStatsModal, setShowSessionStatsModal] = useState(false);
  const [showCourseMapModal, setShowCourseMapModal] = useState(false);
  const [courseMapPlayerXZ, setCourseMapPlayerXZ] = useState({
    x: 0,
    z: 0,
  });

  useLayoutEffect(() => {
    if (!showCourseMapModal) return;
    const st = ballFollowStateRef.current;
    setCourseMapPlayerXZ({
      x: st.valid ? st.pos.x : game.spawnCenter[0],
      z: st.valid ? st.pos.z : game.spawnCenter[2],
    });
  }, [showCourseMapModal, game.spawnCenter[0], game.spawnCenter[2]]);

  useEffect(() => {
    if (!showCourseMapModal) return;
    let raf = 0;
    const loop = () => {
      const st = ballFollowStateRef.current;
      const x = st.valid ? st.pos.x : game.spawnCenter[0];
      const z = st.valid ? st.pos.z : game.spawnCenter[2];
      setCourseMapPlayerXZ((prev) =>
        prev.x === x && prev.z === z ? prev : { x, z }
      );
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [showCourseMapModal, game.spawnCenter[0], game.spawnCenter[2]]);

  useEffect(() => {
    setRetroTvEnabled(loadRetroTvEnabled());
  }, []);

  useEffect(() => {
    setGuidelineEnabled(loadGuidelineEnabled());
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
  const guidelineShootRef = useRef<(() => void) | null>(null);
  const guidelineSpacePowerRepeatRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const clearGuidelineSpacePowerRepeat = useCallback(() => {
    if (guidelineSpacePowerRepeatRef.current) {
      clearInterval(guidelineSpacePowerRepeatRef.current);
      guidelineSpacePowerRepeatRef.current = null;
    }
  }, []);

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

  const onCageTrapped = useCallback(() => {
    setCageEscapeNextShot(true);
    pushHudToast("Caged — next shot is 15% power (breaks cage)");
  }, [pushHudToast]);

  const onBreakGoalCageFromShot = useCallback((cellKey: string) => {
    setGoalCagesBroken((prev) => {
      if (prev.has(cellKey)) return prev;
      const next = new Set(prev);
      next.add(cellKey);
      return next;
    });
    setCageEscapeNextShot(false);
    burstCageBreakConfetti();
  }, []);

  useEffect(() => {
    setGoalCagesBroken(new Set());
    setCageEscapeNextShot(false);
  }, [game.mapCages]);

  const onRetroTvChange = useCallback((next: boolean) => {
    setRetroTvEnabled(next);
    persistRetroTvEnabled(next);
  }, []);

  const onGuidelineEnabledChange = useCallback((next: boolean) => {
    setGuidelineEnabled(next);
    persistGuidelineEnabled(next);
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

  const goToPlazaFromMenu = useCallback(() => {
    setShowHelpModal(false);
    const p = new URLSearchParams();
    const v = searchParams.get("vehicle");
    if (v) p.set("vehicle", v);
    const qs = p.toString();
    router.push(qs ? `/plaza?${qs}` : "/plaza");
  }, [router, searchParams]);

  const goToPlazaAfterSessionEnd = useCallback(() => {
    setShowSessionEndModal(false);
    clearSessionBattleMaps();
    clearPlaySession();
    const p = new URLSearchParams();
    const v = searchParams.get("vehicle");
    if (v) p.set("vehicle", v);
    const qs = p.toString();
    router.push(qs ? `/plaza?${qs}` : "/plaza");
  }, [router, searchParams]);

  const onFinishBattleGoToPlaza = useCallback(() => {
    setShowFinishModal(false);
    clearSessionBattleMaps();
    clearPlaySession();
    const p = new URLSearchParams();
    const v = searchParams.get("vehicle");
    if (v) p.set("vehicle", v);
    const qs = p.toString();
    router.push(qs ? `/plaza?${qs}` : "/plaza");
  }, [router, searchParams]);

  const prevWindMagRef = useRef<number | null>(null);
  const maybeWindToast = useCallback(
    (wx: number, wz: number, resetHole: boolean) => {
      if (resetHole) {
        prevWindMagRef.current = null;
      }
      const mag = Math.hypot(wx, wz);
      const prev = prevWindMagRef.current;
      if (mag > 2 && (prev === null || prev <= 2)) {
        pushHudToast("It's getting windy");
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

  /** War complete screen: new maps + session in localStorage, then full reload into play. */
  const onStartNewWarAfterSessionEnd = useCallback(
    (battleCount: SessionBattleCount) => {
      try {
        sessionStorage.setItem(SESSION_SKIP_START_MODAL_KEY, "1");
      } catch {
        /* ignore */
      }
      onStartNewSession(battleCount, "random");
      window.location.reload();
    },
    [onStartNewSession]
  );
  const [chargeHud, setChargeHud] = useState<{
    remainingMs: number;
    clicks: number;
  } | null>(null);
  const [guidelinePreviewClicks, setGuidelinePreviewClicks] = useState(() =>
    halfClicksForStrengthBarRef(DEFAULT_PLAYER_VEHICLE)
  );
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
  const strengthChargesRef = useRef(strengthCharges);
  const noBounceChargesRef = useRef(noBounceCharges);
  const noWindChargesRef = useRef(noWindCharges);
  const [powerupStackCount, setPowerupStackCount] = useState(0);
  const [noBounceActive, setNoBounceActive] = useState(false);
  const [noWindActive, setNoWindActive] = useState(false);
  const [powerupVehicleBurst, setPowerupVehicleBurst] = useState<{
    seq: number;
    slot: "strength" | "noBounce" | "nowind";
  }>({ seq: 0, slot: "strength" });
  const [windHud, setWindHud] = useState({ x: 0, y: 0, z: 0 });
  strengthChargesRef.current = strengthCharges;
  noBounceChargesRef.current = noBounceCharges;
  noWindChargesRef.current = noWindCharges;
  const inCooldown = cooldownUntil !== null;

  useEffect(() => {
    const m = maxClicksForStrengthBarRef(playerVehicle);
    setGuidelinePreviewClicks((c) => Math.min(m, Math.max(1, c)));
  }, [playerVehicle]);

  const guidelineArmed = guidelineEnabled;
  const guidelineAdjusting =
    guidelineArmed && chargeHud === null && !shotInFlight;

  useEffect(() => {
    windRef.current = stepWind();
    const w = windRef.current;
    maybeWindToast(w.x, w.z, true);
    setWindHud({ x: w.x, y: 0, z: w.z });
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
      playSfx(SFX.coinCollect);
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
    pushHudToast("Enemy Virus down! +3 coins");
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

  const onGuidelineConsumedForShot = useCallback(() => {}, []);

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
      if (shotInFlight || showFinishModal || enemyLossAnimating) return;

      if (slotId === "strength") {
        if (strengthChargesRef.current <= 0) return;
        strengthUsesRoundRef.current += 1;
        powerupStackRef.current += 1;
        setPowerupStackCount(powerupStackRef.current);
        setStrengthCharges((c) => (c <= 0 ? c : c - 1));
        const mult = Math.pow(2, powerupStackRef.current);
        playSfx(SFX.slash);
        pushHudToast(`"Strength" used (×${mult})`, "strength");
        burstPowerupUseConfetti("strength");
        setPowerupVehicleBurst((p) => ({ seq: p.seq + 1, slot: "strength" }));
        return;
      }

      if (slotId === "noBounce") {
        if (noBounceRef.current) return;
        if (noBounceChargesRef.current <= 0) return;
        noBounceUsesRoundRef.current += 1;
        noBounceRef.current = true;
        setNoBounceActive(true);
        setNoBounceCharges((c) => (c <= 0 ? c : c - 1));
        playSfx(SFX.slash);
        pushHudToast(`"No bounce" used`, "noBounce");
        burstPowerupUseConfetti("noBounce");
        setPowerupVehicleBurst((p) => ({ seq: p.seq + 1, slot: "noBounce" }));
        return;
      }

      if (slotId === "nowind") {
        if (noWindRef.current) return;
        if (noWindChargesRef.current <= 0) return;
        noWindRef.current = true;
        setNoWindActive(true);
        setNoWindCharges((c) => (c <= 0 ? c : c - 1));
        playSfx(SFX.slash);
        pushHudToast(`"No wind" used`, "nowind");
        burstPowerupUseConfetti("nowind");
        setPowerupVehicleBurst((p) => ({ seq: p.seq + 1, slot: "nowind" }));
        return;
      }
    },
    [pushHudToast, shotInFlight, showFinishModal, enemyLossAnimating]
  );

  const buyPowerupCharge = useCallback(
    (slotId: PowerupSlotId) => {
      if (
        slotId !== "strength" &&
        slotId !== "noBounce" &&
        slotId !== "nowind"
      ) {
        return;
      }
      if (enemyLossAnimating) return;
      if (!spendGoldCoin()) {
        pushHudToast("Need 1 coin");
        return;
      }
      if (slotId === "strength") {
        const next = strengthChargesRef.current + 1;
        setStrengthCharges((c) => c + 1);
        burstPowerupBuyConfetti("strength");
        pushHudToast(`Strength: ${next}`, "strength");
      } else if (slotId === "noBounce") {
        const next = noBounceChargesRef.current + 1;
        setNoBounceCharges((c) => c + 1);
        burstPowerupBuyConfetti("noBounce");
        pushHudToast(`"No bounce": ${next}`, "noBounce");
      } else if (slotId === "nowind") {
        const next = noWindChargesRef.current + 1;
        setNoWindCharges((c) => c + 1);
        burstPowerupBuyConfetti("nowind");
        pushHudToast(`"No wind": ${next}`, "nowind");
      }
    },
    [
      spendGoldCoin,
      pushHudToast,
      enemyLossAnimating,
      setStrengthCharges,
      setNoBounceCharges,
      setNoWindCharges,
    ]
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

  const bindGuidelineShoot = useCallback((handler: (() => void) | null) => {
    guidelineShootRef.current = handler;
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
      setWindHud({ x: windRef.current.x, y: 0, z: windRef.current.z });
      maybeWindToast(windRef.current.x, windRef.current.z, false);
      if (outcome === "enemy_loss") {
        onEnemyKillReward();
      }
      if (outcome === "penalty") {
        setCageEscapeNextShot(false);
        waterPenaltiesRoundRef.current += 1;
        pushHudToast("Out of bounds");
        dispatch({
          type: "PROJECTILE_END",
          outcome: "penalty",
          revertSpawn: [...spawnBeforeShotRef.current] as Vec3,
        });
      } else {
        let deferredMap = false;
        if (outcome === "hit" || outcome === "enemy_loss") {
          const g = gameRef.current;
          const par = parCoinCountForIslands(
            g.islands,
            INITIAL_LANE_ORIGIN[1],
            [
              g.goalWorldX,
              INITIAL_LANE_ORIGIN[1],
              g.goalWorldZ,
            ] as Vec3
          );
          const shots = sessionShotsRef.current;
          const battleWon =
            outcome === "hit" && shots <= par;
          const session = loadPlaySession();
          const warBattleIndex =
            session != null
              ? session.battlesWon + session.battlesLost + 1
              : 0;
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
          if (battleWon && session && warBattleIndex > 0) {
            recordGoldCoins(warBattleIndex);
            const coinWord = warBattleIndex === 1 ? "coin" : "coins";
            pushHudToast(
              `Battle ${warBattleIndex} won — +${warBattleIndex} ${coinWord}`
            );
          }
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
            deferredMap = true;
            deferMapAdvanceRef.current = true;
            pendingBattleFinishRef.current = { outcome, landing };
          }
          setFinishBattleWon(battleWon);
          setFinishPar(par);
          setFinishLossReason(outcome === "enemy_loss" ? "enemy" : "par");
          setFinishBattleCoinsEarned(
            battleWon && session && warBattleIndex > 0 ? warBattleIndex : 0
          );
        }
        if (!(outcome === "hit" || outcome === "enemy_loss") || !deferredMap) {
          dispatch({
            type: "PROJECTILE_END",
            outcome,
            landing,
          });
        }
      }
      if (outcome === "hit" || outcome === "enemy_loss") {
        setShowFinishModal(true);
        return;
      }
      setCooldownUntil(performance.now() + vehicleShotCooldownMs(playerVehicle));
    },
    [
      maybeWindToast,
      onEnemyKillReward,
      playerVehicle,
      pushHudToast,
      recordHoleCompleted,
      recordGoldCoins,
    ]
  );

  const onFinishBattleContinue = useCallback(() => {
    try {
      if (playSession) {
        sessionStorage.setItem(SESSION_SKIP_START_MODAL_KEY, "1");
      }
    } catch {
      /* ignore */
    }
    window.location.reload();
  }, [playSession]);

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
      enemyLossAnimating
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
              : null;
      if (powerupFromKey !== null) {
        e.preventDefault();
        activatePowerup(powerupFromKey);
        return;
      }
      if (k === "Enter" || e.code === "NumpadEnter") {
        if (!guidelineAdjusting) return;
        if (
          shotInFlight ||
          showFinishModal ||
          showStartGameModal ||
          showSessionEndModal ||
          inCooldown ||
          enemyLossAnimating
        ) {
          return;
        }
        if (e.repeat) return;
        e.preventDefault();
        guidelineShootRef.current?.();
        return;
      }
      if (k === " " || e.code === "Space") {
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
          const m = maxClicksForStrengthBarRef(playerVehicle);
          const bumpGuidePower = () => {
            setGuidelinePreviewClicks((c) => Math.min(m, Math.max(1, c) + 1));
          };
          bumpGuidePower();
          clearGuidelineSpacePowerRepeat();
          guidelineSpacePowerRepeatRef.current = setInterval(
            bumpGuidePower,
            CHARGE_HOLD_REPEAT_MS
          );
          return;
        }
        fireHeldRef.current?.(true);
        return;
      }
      if (chargeHud !== null) {
        return;
      }
      if (k === "w" || k === "W" || k === "ArrowUp") {
        setAimPitchOffsetRad((p) => {
          const next = clampAimPitchOffsetRad(p + AIM_PITCH_STEP_RAD);
          if (guidelineAdjusting && next === p) {
            const m = maxClicksForStrengthBarRef(playerVehicle);
            setGuidelinePreviewClicks((c) =>
              Math.min(m, Math.max(1, c) + 1)
            );
          }
          return next;
        });
        if (k === "ArrowUp") e.preventDefault();
        return;
      }
      if (k === "s" || k === "S" || k === "ArrowDown") {
        setAimPitchOffsetRad((p) => {
          const next = clampAimPitchOffsetRad(p - AIM_PITCH_STEP_RAD);
          if (guidelineAdjusting && next === p) {
            setGuidelinePreviewClicks((c) => Math.max(1, c - 1));
          }
          return next;
        });
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
    return () => {
      window.removeEventListener("keydown", onKey);
      clearGuidelineSpacePowerRepeat();
    };
  }, [
    shotInFlight,
    showFinishModal,
    showStartGameModal,
    showSessionEndModal,
    showHelpModal,
    showProfileModal,
    inCooldown,
    chargeHud,
    activatePowerup,
    guidelineAdjusting,
    playerVehicle,
    clearGuidelineSpacePowerRepeat,
    enemyLossAnimating,
  ]);

  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== " " && e.code !== "Space") return;
      /** Stop repeat even if keyup targets an input (interval may have started from window keydown). */
      clearGuidelineSpacePowerRepeat();
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
    const onWindowBlur = () => {
      clearGuidelineSpacePowerRepeat();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearGuidelineSpacePowerRepeat();
      }
    };
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [clearGuidelineSpacePowerRepeat]);

  const powerupMenuLocked =
    chargeHud !== null || shotInFlight || enemyLossAnimating;
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
              showFinishModal ||
              showStartGameModal ||
              showSessionEndModal ||
              enemyLossAnimating
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
            onBindGuidelineShoot={bindGuidelineShoot}
            isCharging={chargeHud !== null}
            powerupStackCount={powerupStackCount}
            noBounceActive={noBounceActive}
            noWindActive={noWindActive}
            guidelineActiveNextShot={guidelineEnabled}
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
            ballFollowStateRef={ballFollowStateRef}
            goalEnemies={game.goalEnemies}
            onEnemyLossAnimatingChange={setEnemyLossAnimating}
            equippedHatId={shopInventory.equippedHatId}
            mapCages={game.mapCages}
            goalCagesBroken={goalCagesBroken}
            cageEscapeNextShot={cageEscapeNextShot}
            onCageTrapped={onCageTrapped}
            onBreakGoalCageFromShot={onBreakGoalCageFromShot}
            powerupVehicleBurstSeq={powerupVehicleBurst.seq}
            powerupVehicleBurstSlot={powerupVehicleBurst.slot}
          />
        </TeleportOrbitRig>
        {/** Draw after scene content so the green turf sits on top of `TerrainTextured`. */}
        <InitialFieldGround islands={islands} biome={game.biome} />
        <IslandMiniVillage miniVillage={game.miniVillage} />
        <IslandBushes islands={islands} biome={game.biome} />
        <IslandTrees islands={islands} biome={game.biome} />
        <RetroTvPostFx enabled={retroTvEnabled} />
        <RendererStatsCollector statsRef={rendererStatsRef} />
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
          onScoreClick={() => {
            if (enemyLossAnimating) return;
            setShowSessionStatsModal(true);
          }}
          rendererStatsRef={rendererStatsRef}
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
              disabled={enemyLossAnimating}
              onClick={() => {
                if (enemyLossAnimating) return;
                setShowProfileModal(false);
                setShowHelpModal(true);
              }}
              style={goldChipButtonStyle()}
            >
              Menu
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
            <div
              style={{
                pointerEvents: enemyLossAnimating ? "none" : "auto",
              }}
            >
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
                  canUseStrength={strengthCharges > 0}
                  canUseNoBounce={
                    noBounceCharges > 0 && !noBounceActive
                  }
                  canUseNoWind={noWindCharges > 0 && !noWindActive}
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
                  disabled={shotInFlight || enemyLossAnimating}
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
                  disabled={shotInFlight || enemyLossAnimating}
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
                    aria-label="Shoot"
                    onClick={() => guidelineShootRef.current?.()}
                    disabled={
                      shotInFlight ||
                      showFinishModal ||
                      showStartGameModal ||
                      showSessionEndModal ||
                      inCooldown ||
                      enemyLossAnimating
                    }
                    style={hudRoundFireButtonStyle(
                      shotInFlight ||
                        showFinishModal ||
                        showStartGameModal ||
                        showSessionEndModal ||
                        inCooldown ||
                        enemyLossAnimating
                        ? "disabled"
                        : "guidelineReady"
                    )}
                  >
                    Shoot
                  </button>
                </div>
              )}
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
                      inCooldown ||
                      enemyLossAnimating;
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
                    inCooldown ||
                    enemyLossAnimating
                  }
                  style={hudRoundFireButtonStyle(
                    shotInFlight ||
                      showFinishModal ||
                      showStartGameModal ||
                      showSessionEndModal ||
                      inCooldown ||
                      enemyLossAnimating
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
        onOpenHelp={() => setShowHelpModal(true)}
      />
      <FinishGameModal
        open={showFinishModal}
        sessionShots={sessionShots}
        par={finishPar}
        battleWon={finishBattleWon}
        lossReason={finishLossReason}
        coinsEarned={finishBattleCoinsEarned}
        warBattlesPlayed={
          playSession
            ? playSession.battlesWon + playSession.battlesLost
            : undefined
        }
        warBattlesLeft={
          playSession
            ? playSession.targetBattles -
              (playSession.battlesWon + playSession.battlesLost)
            : undefined
        }
        onContinue={onFinishBattleContinue}
        onGoToPlaza={onFinishBattleGoToPlaza}
        onOpenHelp={() => setShowHelpModal(true)}
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
        onStartNewSession={onStartNewWarAfterSessionEnd}
        onGoToPlaza={goToPlazaAfterSessionEnd}
        onOpenHelp={() => setShowHelpModal(true)}
      />
      <HelpModal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onOpenProfile={() => {
          setShowHelpModal(false);
          setShowProfileModal(true);
        }}
        onGoToPlaza={goToPlazaFromMenu}
        vehicle={playerVehicle}
        retroTvEnabled={retroTvEnabled}
        onRetroTvChange={onRetroTvChange}
        guidelineEnabled={guidelineEnabled}
        onGuidelineEnabledChange={onGuidelineEnabledChange}
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
        warMaps={sessionWarMapsPayload?.maps ?? null}
        initialBattleIndex={
          playSession
            ? playSession.battlesWon + playSession.battlesLost
            : 0
        }
        currentBattleIndex={
          playSession
            ? playSession.battlesWon + playSession.battlesLost
            : 0
        }
        playerWorldX={courseMapPlayerXZ.x}
        playerWorldZ={courseMapPlayerXZ.z}
      />
    </div>
  );
}
