"use client";

import { MatchChatPanel } from "@/components/MatchChatPanel";
import { ToastNotif } from "@/components/ToastNotif";
import { usePlayerStats } from "@/components/PlayerStatsProvider";
import { AimHud } from "@/components/game/cube/hud/AimHud";
import { AimPadHud } from "@/components/game/cube/hud/AimPadHud";
import { PowerupSlotRow } from "@/components/game/cube/hud/PowerupSlotRow";
import { GuidelinePreviewPowerSlider } from "@/components/game/cube/hud/GuidelinePreviewPowerSlider";
import { FirePowerVerticalHud, ShotHud } from "@/components/game/cube/hud/ShotHud";
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
import { ProfileModal } from "@/components/game/cube/modals/ProfileModal";
import { SceneContent } from "@/components/game/cube/SceneContent";
import { TeleportOrbitRig } from "@/components/game/cube/TeleportOrbitRig";
import { StaticSceneLights } from "@/components/game/cube/StaticSceneLights";
import {
  dangerChipButtonStyle,
  goldChipButtonGroupLeftDangerStyle,
  goldChipButtonGroupRightStyle,
  goldChipButtonStyle,
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
  getVehicleByVId,
  halfClicksForStrengthBarRef,
  maxClicksForStrengthBarRef,
  vehicleIdForQueryString,
  vehicleShotCooldownMs,
} from "@/components/playerVehicleConfig";
import { useResolvedPlayerVehicle } from "@/lib/game/useResolvedPlayerVehicle";
import { usePlayerShopInventory } from "@/lib/shop/usePlayerShopInventory";
import { onCanvasCreated } from "@/lib/game/canvas";
import {
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
  PVP_PVE_TURN_TIME_LIMIT_MS,
  SKY_GRADIENT_CSS,
} from "@/lib/game/constants";
import {
  createInitialGameStateFromSeed,
  withDefaultBiome,
} from "@/lib/game/gameState";
import { parsePvpRoomBiomeChoice } from "@/lib/game/pvpRoomBiome";
import { resolvePvpRoomBiome } from "@/lib/game/sessionBattleMaps";
import { ensureSpawnAndGoalOnIslandsImmutable } from "@/lib/game/islands";
import { loadAimControlMode, persistAimControlMode, type AimControlMode } from "@/lib/game/aimControlSettings";
import { loadRetroTvEnabled, persistRetroTvEnabled } from "@/lib/game/retroTvSettings";
import { loadGuidelineEnabled, persistGuidelineEnabled } from "@/lib/game/guidelineSettings";
import {
  bodyYawQuarterSnappedFromWorldAim,
  clampAimPitchOffsetRad,
  clampYawDeltaToPadArc,
  hudAimYawToWorldYawRad,
  snapAimAngleRad,
  snapBlockCenterToGrid,
  wrapYawRad,
} from "@/lib/game/math";
import { parCoinCountForIslands } from "@/lib/game/path";
import { pveSideBySideSpawnsFromSeed } from "@/lib/game/pvpTeeSpawns";
import { pvpGameReducer } from "@/lib/game/pvpGameState";
import { BGM, startBgmLoop, stopBgm } from "@/lib/sfx/bgMusicPlayer";
import { playSfx, SFX } from "@/lib/sfx/sfxPlayer";
import { INITIAL_LANE_ORIGIN, type PowerupSlotId, type Vec3 } from "@/lib/game/types";
import type { PvpShotBroadcastPayload } from "@/lib/pvp/shotBroadcast";
import type { PvpRoomRow } from "@/lib/pvp/types";
import { usePvpRoom } from "@/lib/pvp/usePvpRoom";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { stepWindFromSeed } from "@/lib/game/wind";
import { Canvas } from "@react-three/fiber";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

const PVP_OPPONENT_ENEMY = [{ colorHex: "#e11d48" }] as const;

function formatPvpTurnClock(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Avoid spawn sync reading stale `gameRef` in the same effect flush as course hydration (would spread seed-1 layout over the real room course). */
function pvpGameStateMatchesRoomCourse(
  g: { goalWorldX: number; goalWorldZ: number },
  room: Pick<PvpRoomRow, "course_seed" | "match_mode" | "biome_choice"> | null
): boolean {
  if (!room || room.course_seed == null) return true;
  const seed = Number(room.course_seed);
  const pve = (room.match_mode ?? "pvp") === "pve";
  const choice = parsePvpRoomBiomeChoice(room.biome_choice);
  const biome = resolvePvpRoomBiome(seed, choice);
  const expected = createInitialGameStateFromSeed(seed, {
    biome,
    goalEnemies: pve ? [] : [...PVP_OPPONENT_ENEMY],
  });
  return g.goalWorldX === expected.goalWorldX && g.goalWorldZ === expected.goalWorldZ;
}

export default function PvpCubeScene({ roomId }: { roomId: string }) {
  const { recordGoldCoin, recordGoldCoins, spendGoldCoin, stats } =
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
  const hasExplicitVehicleInUrl =
    vehicleParam != null && vehicleParam.trim() !== "";
  const { playerVehicle, preferenceHydrated } = useResolvedPlayerVehicle(
    vehicleParam,
    stats,
    shopInventory.ownedVehicleIds
  );

  const [incomingGhostShot, setIncomingGhostShot] =
    useState<PvpShotBroadcastPayload | null>(null);
  const onRemoteShot = useCallback((payload: PvpShotBroadcastPayload) => {
    setIncomingGhostShot(payload);
  }, []);
  const clearIncomingGhostShot = useCallback(() => {
    setIncomingGhostShot(null);
  }, []);

  const {
    room,
    userId,
    initialFetchDone,
    error: roomError,
    refreshRoom,
    broadcastShot,
  } = usePvpRoom(roomId, onRemoteShot);

  /** Host: full reload when a guest joins so canvas/state match the two-player room. */
  const hostOpponentJoinReloadRef = useRef<{
    roomId: string | null;
    sawNoGuest: boolean;
  } | null>(null);
  useEffect(() => {
    if (!room?.id || !userId) return;
    if (userId !== room.host_user_id) return;

    const guestId = room.guest_user_id ?? null;
    const rid = room.id;

    if (
      hostOpponentJoinReloadRef.current === null ||
      hostOpponentJoinReloadRef.current.roomId !== rid
    ) {
      hostOpponentJoinReloadRef.current = {
        roomId: rid,
        sawNoGuest: guestId === null,
      };
      return;
    }

    if (hostOpponentJoinReloadRef.current.sawNoGuest && guestId !== null) {
      window.location.reload();
      return;
    }

    if (guestId !== null) {
      hostOpponentJoinReloadRef.current.sawNoGuest = false;
    }
  }, [room?.id, room?.guest_user_id, room?.host_user_id, userId]);

  const isPve = (room?.match_mode ?? "pvp") === "pve";

  const resolvedCourseBiome = useMemo(() => {
    if (room?.course_seed == null) return null;
    const choice = parsePvpRoomBiomeChoice(room.biome_choice);
    return resolvePvpRoomBiome(Number(room.course_seed), choice);
  }, [room?.course_seed, room?.biome_choice]);

  const pveSpawns = useMemo(() => {
    if (room?.course_seed == null || resolvedCourseBiome == null) return null;
    return pveSideBySideSpawnsFromSeed(
      Number(room.course_seed),
      resolvedCourseBiome
    );
  }, [room?.course_seed, resolvedCourseBiome]);

  const opponentVehicle = useMemo(() => {
    if (!room || !userId) return DEFAULT_PLAYER_VEHICLE;
    const oid =
      userId === room.host_user_id
        ? room.guest_vehicle_id
        : room.host_vehicle_id;
    const raw = String(oid ?? "default").trim().toLowerCase() || "default";
    return getVehicleByVId(raw) ?? DEFAULT_PLAYER_VEHICLE;
  }, [room, userId]);

  useEffect(() => {
    if (!room?.id || !userId) return;
    if (!hasExplicitVehicleInUrl && !preferenceHydrated) return;
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { error } = await supabase.rpc("set_pvp_room_vehicle", {
        p_room_id: room.id,
        p_vehicle_id: playerVehicle.id,
      });
      if (!error) await refreshRoom();
    })();
  }, [
    room?.id,
    userId,
    playerVehicle.id,
    preferenceHydrated,
    hasExplicitVehicleInUrl,
    refreshRoom,
  ]);

  const [game, dispatch] = useReducer(
    pvpGameReducer,
    undefined,
    () =>
      createInitialGameStateFromSeed(1, {
        goalEnemies: [...PVP_OPPONENT_ENEMY],
      })
  );

  const courseSeedRef = useRef(1);
  const hydratedRoomIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!room?.id || room.course_seed == null) return;
    if (hydratedRoomIdRef.current === room.id) return;
    hydratedRoomIdRef.current = room.id;
    const seed = Number(room.course_seed);
    const pve = (room.match_mode ?? "pvp") === "pve";
    const choice = parsePvpRoomBiomeChoice(room.biome_choice);
    const biome = resolvePvpRoomBiome(seed, choice);
    courseSeedRef.current = seed;
    dispatch({
      type: "REPLACE_GAME_STATE",
      state: createInitialGameStateFromSeed(seed, {
        biome,
        goalEnemies: pve ? [] : [...PVP_OPPONENT_ENEMY],
      }),
    });
  }, [room?.id, room?.course_seed, room?.match_mode, room?.biome_choice]);

  const goalCenter: Vec3 = [
    game.goalWorldX,
    INITIAL_LANE_ORIGIN[1],
    game.goalWorldZ,
  ];

  const gameRef = useRef(game);
  gameRef.current = game;

  /** Tee spawn for this course seed (host side) — used until `host_spawn_*` is persisted. */
  const teeSpawnFromSeed = useMemo((): Vec3 | null => {
    if (room?.course_seed == null || resolvedCourseBiome == null) return null;
    const seed = Number(room.course_seed);
    return createInitialGameStateFromSeed(seed, {
      biome: resolvedCourseBiome,
      goalEnemies: isPve ? [] : [...PVP_OPPONENT_ENEMY],
    }).spawnCenter;
  }, [room?.course_seed, isPve, resolvedCourseBiome]);

  /** Opponent world position: PvP host sees guest at goal; PvE both tee side-by-side; guest sees host at tee (DB or seed). */
  const pvpOpponentWorldPos = useMemo((): Vec3 => {
    if (!room || !userId) return goalCenter;
    const isHost = userId === room.host_user_id;
    if (isHost) {
      const gx = room.guest_spawn_x;
      const gy = room.guest_spawn_y;
      const gz = room.guest_spawn_z;
      if (gx == null || gy == null || gz == null) {
        if (isPve && pveSpawns) return pveSpawns.guestSpawn;
        return goalCenter;
      }
      return [Number(gx), Number(gy), Number(gz)];
    }
    const hx = Number(room.host_spawn_x ?? 0);
    const hy = Number(room.host_spawn_y ?? 0);
    const hz = Number(room.host_spawn_z ?? 0);
    if (hx === 0 && hy === 0 && hz === 0 && teeSpawnFromSeed != null) {
      if (isPve && pveSpawns) return pveSpawns.hostSpawn;
      return teeSpawnFromSeed;
    }
    return [hx, hy, hz];
  }, [room, userId, goalCenter, teeSpawnFromSeed, isPve, pveSpawns]);

  const hostTeeRpcSentRef = useRef(false);
  useEffect(() => {
    hostTeeRpcSentRef.current = false;
  }, [roomId]);

  useEffect(() => {
    if (!room?.id || room.host_user_id !== userId) return;
    if (room.guest_user_id == null) return;
    if (room.status !== "playing") return;
    const hx = Number(room.host_spawn_x ?? 0);
    const hy = Number(room.host_spawn_y ?? 0);
    const hz = Number(room.host_spawn_z ?? 0);
    if (hx !== 0 || hy !== 0 || hz !== 0) return;
    if (hostTeeRpcSentRef.current) return;
    hostTeeRpcSentRef.current = true;
    const supabase = createSupabaseBrowserClient();
    const pve = (room.match_mode ?? "pvp") === "pve";
    const s = pve && pveSpawns ? pveSpawns.hostSpawn : game.spawnCenter;
    void (async () => {
      const { error } = await supabase.rpc("set_pvp_host_spawn_if_default", {
        p_room_id: room.id,
        p_x: Math.round(s[0]),
        p_y: Math.round(s[1]),
        p_z: Math.round(s[2]),
      });
      if (error) {
        hostTeeRpcSentRef.current = false;
        return;
      }
      await refreshRoom();
    })();
  }, [
    room?.id,
    room?.status,
    room?.guest_user_id,
    room?.host_user_id,
    room?.host_spawn_x,
    room?.host_spawn_y,
    room?.host_spawn_z,
    room?.match_mode,
    userId,
    game.spawnCenter,
    pveSpawns,
    refreshRoom,
  ]);

  useEffect(() => {
    if (!room?.id || room.status !== "playing" || room.guest_user_id == null) return;
    if (room.guest_spawn_x != null) return;
    const supabase = createSupabaseBrowserClient();
    const pve = (room.match_mode ?? "pvp") === "pve";
    const gx = pve && pveSpawns ? pveSpawns.guestSpawn[0] : game.goalWorldX;
    const gy = pve && pveSpawns ? pveSpawns.guestSpawn[1] : INITIAL_LANE_ORIGIN[1];
    const gz = pve && pveSpawns ? pveSpawns.guestSpawn[2] : game.goalWorldZ;
    void (async () => {
      const { error } = await supabase.rpc("set_pvp_guest_start_if_null", {
        p_room_id: room.id,
        p_x: Math.round(gx),
        p_y: Math.round(gy),
        p_z: Math.round(gz),
      });
      if (!error) await refreshRoom();
    })();
  }, [
    room?.id,
    room?.status,
    room?.guest_user_id,
    room?.guest_spawn_x,
    room?.match_mode,
    game.goalWorldX,
    game.goalWorldZ,
    pveSpawns,
    refreshRoom,
  ]);

  const lastGuestSpawnSyncKeyRef = useRef("");
  useEffect(() => {
    if (!room || !userId || room.guest_user_id !== userId) return;
    if (room.guest_spawn_x == null || room.guest_spawn_y == null || room.guest_spawn_z == null)
      return;
    const key = `${room.guest_spawn_x},${room.guest_spawn_y},${room.guest_spawn_z}`;
    if (key === lastGuestSpawnSyncKeyRef.current) return;

    const next: Vec3 = [
      Number(room.guest_spawn_x),
      Number(room.guest_spawn_y),
      Number(room.guest_spawn_z),
    ];
    const g = gameRef.current;
    if (!pvpGameStateMatchesRoomCourse(g, room)) return;
    if (
      g.spawnCenter[0] === next[0] &&
      g.spawnCenter[1] === next[1] &&
      g.spawnCenter[2] === next[2]
    ) {
      lastGuestSpawnSyncKeyRef.current = key;
      return;
    }
    lastGuestSpawnSyncKeyRef.current = key;
    const gc: Vec3 = [
      g.goalWorldX,
      INITIAL_LANE_ORIGIN[1],
      g.goalWorldZ,
    ];
    dispatch({
      type: "REPLACE_GAME_STATE",
      state: withDefaultBiome({
        ...g,
        spawnCenter: next,
        islands: ensureSpawnAndGoalOnIslandsImmutable(g.islands, next, gc),
      }),
    });
  }, [
    room?.guest_spawn_x,
    room?.guest_spawn_y,
    room?.guest_spawn_z,
    room?.guest_user_id,
    userId,
    dispatch,
    game.goalWorldX,
    game.goalWorldZ,
  ]);

  const lastHostSpawnSyncKeyRef = useRef("");
  useEffect(() => {
    if (!room || !userId || room.host_user_id !== userId) return;
    const hx = Number(room.host_spawn_x ?? 0);
    const hy = Number(room.host_spawn_y ?? 0);
    const hz = Number(room.host_spawn_z ?? 0);
    if (hx === 0 && hy === 0 && hz === 0) return;

    const key = `${hx},${hy},${hz}`;
    if (key === lastHostSpawnSyncKeyRef.current) return;

    const next: Vec3 = [hx, hy, hz];
    const g = gameRef.current;
    if (!pvpGameStateMatchesRoomCourse(g, room)) return;
    if (
      g.spawnCenter[0] === next[0] &&
      g.spawnCenter[1] === next[1] &&
      g.spawnCenter[2] === next[2]
    ) {
      lastHostSpawnSyncKeyRef.current = key;
      return;
    }
    lastHostSpawnSyncKeyRef.current = key;
    const gc: Vec3 = [
      g.goalWorldX,
      INITIAL_LANE_ORIGIN[1],
      g.goalWorldZ,
    ];
    dispatch({
      type: "REPLACE_GAME_STATE",
      state: withDefaultBiome({
        ...g,
        spawnCenter: next,
        islands: ensureSpawnAndGoalOnIslandsImmutable(g.islands, next, gc),
      }),
    });
  }, [
    room?.host_spawn_x,
    room?.host_spawn_y,
    room?.host_spawn_z,
    room?.host_user_id,
    userId,
    dispatch,
    game.goalWorldX,
    game.goalWorldZ,
  ]);

  const islands = game.islands;
  const holePar = useMemo(
    () => parCoinCountForIslands(islands, INITIAL_LANE_ORIGIN[1], goalCenter),
    [islands, goalCenter]
  );

  const gameSpawnRef = useRef<Vec3>(game.spawnCenter);
  gameSpawnRef.current = game.spawnCenter;
  const spawnBeforeShotRef = useRef<Vec3>(game.spawnCenter);

  const [aimYawRad, setAimYawRad] = useState(0);
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
  const sessionShotsRef = useRef(sessionShots);
  sessionShotsRef.current = sessionShots;

  const [enemyLossAnimating, setEnemyLossAnimating] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLeaveRoomConfirm, setShowLeaveRoomConfirm] = useState(false);
  const [retroTvEnabled, setRetroTvEnabled] = useState(false);
  const [guidelineEnabled, setGuidelineEnabled] = useState(true);
  const [aimControlMode, setAimControlMode] = useState<AimControlMode>("pad");
  const [hudToastToken, setHudToastToken] = useState(0);
  const [hudToastMessage, setHudToastMessage] = useState("");
  const [hudToastAccent, setHudToastAccent] = useState<
    "strength" | "noBounce" | "nowind" | "guideline" | undefined
  >(undefined);
  const fireHeldRef = useRef<((held: boolean) => void) | null>(null);
  const guidelineShootRef = useRef<(() => void) | null>(null);

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

  useEffect(() => {
    if (!room?.id || !userId) return;
    const matchFinished =
      room.status === "finished" || room.winner_user_id != null;
    if (!matchFinished || room.winner_user_id !== userId) return;
    const mode = room.match_mode ?? "pvp";
    if (mode !== "pvp" && mode !== "pve") return;

    const storageKey = `pvp_pve_win_coins_${room.id}`;
    try {
      if (
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(storageKey)
      ) {
        return;
      }
    } catch {
      // ignore
    }

    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(storageKey, "1");
      }
    } catch {
      // ignore
    }

    recordGoldCoins(10);
    pushHudToast("Victory — +10 coins");
  }, [
    room?.id,
    room?.status,
    room?.winner_user_id,
    room?.match_mode,
    userId,
    recordGoldCoins,
    pushHudToast,
  ]);

  useEffect(() => {
    if (!showProfileModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowProfileModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showProfileModal]);

  useEffect(() => {
    if (!showLeaveRoomConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowLeaveRoomConfirm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLeaveRoomConfirm]);

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

  const goToPlaza = useCallback(() => {
    const p = new URLSearchParams();
    const v = vehicleIdForQueryString(playerVehicle);
    if (v) p.set("vehicle", v);
    const qs = p.toString();
    router.push(qs ? `/plaza?${qs}` : "/plaza");
  }, [router, playerVehicle]);

  const leavePvpRoom = useCallback(() => {
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.rpc("leave_pvp_room", {
        p_room_id: roomId,
      });
      if (error) {
        pushHudToast(error.message);
        return;
      }
      goToPlaza();
    })();
  }, [roomId, goToPlaza, pushHudToast]);

  const sendMatchChat = useCallback(
    async (message: string) => {
      if (!room?.id) return;
      const supabase = createSupabaseBrowserClient();
      const { error: chatErr } = await supabase.rpc("append_pvp_room_chat", {
        p_room_id: room.id,
        p_message: message,
      });
      if (chatErr) {
        pushHudToast(chatErr.message);
        return;
      }
      await refreshRoom();
    },
    [room?.id, refreshRoom, pushHudToast]
  );

  const pollRoomForChat = useCallback(() => {
    void refreshRoom();
  }, [refreshRoom]);

  const prevWindMagRef = useRef<number | null>(null);
  const maybeWindToast = useCallback(
    (wx: number, wz: number, resetHole: boolean) => {
      if (resetHole) prevWindMagRef.current = null;
      const mag = Math.hypot(wx, wz);
      const prev = prevWindMagRef.current;
      if (mag > 2 && (prev === null || prev <= 2)) {
        pushHudToast("It's getting windy");
      }
      prevWindMagRef.current = mag;
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
  const [, setHudTick] = useState(0);
  const [turnTimerTick, setTurnTimerTick] = useState(0);
  const turnSubmitPendingRef = useRef(false);
  const forfeitOnceRef = useRef(false);
  const prevIsMyTurnRef = useRef(false);
  const turnDeadlineMsRef = useRef<number | null>(null);
  const pauseRemainingMsRef = useRef<number | null>(null);

  const powerupStackRef = useRef(0);
  const noBounceRef = useRef(false);
  const noWindRef = useRef(false);
  const windRef = useRef({ x: 0, z: 0 });
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

  useEffect(() => {
    const m = maxClicksForStrengthBarRef(playerVehicle);
    setGuidelinePreviewClicks((c) => Math.min(m, Math.max(1, c)));
  }, [playerVehicle]);

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
    const seed = courseSeedRef.current;
    const w0 = stepWindFromSeed(seed, 0);
    windRef.current = stepWindFromSeed(seed, 1);
    setWindHud({ x: w0.x, y: 0, z: w0.z });
    maybeWindToast(w0.x, w0.z, true);
  }, [room?.id, room?.course_seed, maybeWindToast]);

  useEffect(() => {
    setAimPitchOffsetRad(0);
  }, [playerVehicle.id]);

  const collectedCoinKeysRef = useRef(new Set<string>());
  const [coinRenderTick, setCoinRenderTick] = useState(0);

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
    pushHudToast("Hit opponent!");
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
    const shotIdx = sessionShotsRef.current;
    const seed = courseSeedRef.current;
    const useNoWind = noWindRef.current;
    const w = stepWindFromSeed(seed, shotIdx);
    windRef.current = stepWindFromSeed(seed, shotIdx + 1);
    const ax = useNoWind ? 0 : w.x;
    const az = useNoWind ? 0 : w.z;
    return { ax, az };
  }, []);

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
    turnSubmitPendingRef.current = true;
    setShotInFlight(true);
    spawnBeforeShotRef.current = gameSpawnRef.current;
    setSessionShots((n) => n + 1);
    burstShotGreyConfetti();
  }, []);

  const onProjectileEnd = useCallback(
    (
      outcome: "hit" | "miss" | "penalty" | "enemy_loss" | "enemy_kill",
      landing?: Vec3
    ) => {
      setShotInFlight(false);
      setWindHud({ x: windRef.current.x, y: 0, z: windRef.current.z });
      maybeWindToast(windRef.current.x, windRef.current.z, false);

      const rid = room?.id;
      if (!rid) {
        turnSubmitPendingRef.current = false;
        return;
      }

      const rpcOutcome =
        outcome === "hit" || outcome === "enemy_loss"
          ? "hit"
          : outcome === "penalty"
            ? "penalty"
            : "miss";

      void (async () => {
        try {
        const supabase = createSupabaseBrowserClient();
        // Always pass all five args (null spawns) so PostgREST matches submit_pvp_shot(uuid, text, bigint, bigint, bigint).
        let p_spawn_x: number | null = null;
        let p_spawn_y: number | null = null;
        let p_spawn_z: number | null = null;
        if (outcome === "miss" && landing) {
          const s = snapBlockCenterToGrid(landing);
          p_spawn_x = Math.round(s[0]);
          p_spawn_y = Math.round(s[1]);
          p_spawn_z = Math.round(s[2]);
        } else if (outcome === "penalty") {
          const s = snapBlockCenterToGrid(
            [...spawnBeforeShotRef.current] as Vec3
          );
          p_spawn_x = Math.round(s[0]);
          p_spawn_y = Math.round(s[1]);
          p_spawn_z = Math.round(s[2]);
        }
        const { error: rpcErr } = await supabase.rpc("submit_pvp_shot", {
          p_room_id: rid,
          p_outcome: rpcOutcome,
          p_spawn_x,
          p_spawn_y,
          p_spawn_z,
        });
        if (rpcErr) {
          pushHudToast(rpcErr.message);
          return;
        }

        if (
          (outcome === "enemy_loss" && !isPve) ||
          (outcome === "hit" && isPve)
        ) {
          playSfx(SFX.conff);
        }

        if (outcome === "enemy_loss") {
          onEnemyKillReward();
        }

        if (outcome === "penalty") {
          playSfx(SFX.errorBip);
          setCageEscapeNextShot(false);
          dispatch({
            type: "PROJECTILE_END",
            outcome: "penalty",
            revertSpawn: [...spawnBeforeShotRef.current] as Vec3,
          });
        } else if (outcome === "miss") {
          dispatch({
            type: "PROJECTILE_END",
            outcome: "miss",
            landing,
          });
        }

        setCooldownUntil(performance.now() + vehicleShotCooldownMs(playerVehicle));
        } finally {
          turnSubmitPendingRef.current = false;
        }
      })();
    },
    [
      dispatch,
      isPve,
      maybeWindToast,
      onEnemyKillReward,
      playerVehicle,
      pushHudToast,
      room?.id,
    ]
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
    if (chargeHud !== null || shotInFlight) setShowPowerupMenu(false);
  }, [chargeHud, shotInFlight]);

  const activatePowerup = useCallback(
    (slotId: PowerupSlotId) => {
      if (shotInFlight || enemyLossAnimating) return;
      if (slotId === "strength") {
        if (strengthChargesRef.current <= 0) return;
        powerupStackRef.current += 1;
        setPowerupStackCount(powerupStackRef.current);
        setStrengthCharges((c) => (c <= 0 ? c : c - 1));
        playSfx(SFX.slash);
        pushHudToast(`"Strength" used (×${Math.pow(2, powerupStackRef.current)})`, "strength");
        burstPowerupUseConfetti("strength");
        setPowerupVehicleBurst((p) => ({ seq: p.seq + 1, slot: "strength" }));
        return;
      }
      if (slotId === "noBounce") {
        if (noBounceChargesRef.current <= 0 || noBounceActive) return;
        noBounceRef.current = true;
        setNoBounceActive(true);
        setNoBounceCharges((c) => (c <= 0 ? c : c - 1));
        playSfx(SFX.slash);
        pushHudToast('"No bounce" used', "noBounce");
        burstPowerupUseConfetti("noBounce");
        setPowerupVehicleBurst((p) => ({ seq: p.seq + 1, slot: "noBounce" }));
        return;
      }
      if (slotId === "nowind") {
        if (noWindChargesRef.current <= 0 || noWindActive) return;
        noWindRef.current = true;
        setNoWindActive(true);
        setNoWindCharges((c) => (c <= 0 ? c : c - 1));
        playSfx(SFX.slash);
        pushHudToast('"No wind" used', "nowind");
        burstPowerupUseConfetti("nowind");
        setPowerupVehicleBurst((p) => ({ seq: p.seq + 1, slot: "nowind" }));
      }
    },
    [enemyLossAnimating, noBounceActive, noWindActive, pushHudToast, shotInFlight]
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
      playSfx(SFX.kash);
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
      } else {
        const next = noWindChargesRef.current + 1;
        setNoWindCharges((c) => c + 1);
        burstPowerupBuyConfetti("nowind");
        pushHudToast(`"No wind": ${next}`, "nowind");
      }
    },
    [
      enemyLossAnimating,
      pushHudToast,
      spendGoldCoin,
      setStrengthCharges,
      setNoBounceCharges,
      setNoWindCharges,
    ]
  );

  const [showPowerupMenu, setShowPowerupMenu] = useState(false);
  const powerupMenuLocked = chargeHud !== null || shotInFlight || enemyLossAnimating;
  const powerupMenuOpen = showPowerupMenu && !powerupMenuLocked;

  const bothPlayersReady =
    room?.status === "playing" &&
    room.guest_user_id != null &&
    room.host_user_id != null;
  const isMyTurn =
    userId != null && room?.current_turn_user_id === userId;
  const matchOver = room?.status === "finished" || room?.winner_user_id != null;
  const waitingForOpponent =
    room?.status === "waiting" || room?.guest_user_id == null;

  useEffect(() => {
    if (!room?.id) return;
    if (matchOver) {
      if (room.winner_user_id === userId) startBgmLoop(BGM.battleWin, 0.5);
      else stopBgm();
      return;
    }
    const track = isPve ? BGM.battle : BGM.pvp;
    startBgmLoop(track, 0.5);
  }, [
    room?.id,
    matchOver,
    room?.winner_user_id,
    room?.status,
    userId,
    isPve,
  ]);

  const roundLocked =
    !bothPlayersReady ||
    !isMyTurn ||
    matchOver ||
    enemyLossAnimating ||
    waitingForOpponent ||
    shotInFlight;

  const guidelineArmed = guidelineEnabled;
  const guidelineAdjusting =
    guidelineArmed && chargeHud === null && !shotInFlight;

  const remainingCooldownMs =
    cooldownUntil !== null ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const inCooldown =
    cooldownUntil !== null && remainingCooldownMs > 0;
  const showShotHudPanel =
    (chargeHud !== null && !shotInFlight) ||
    (inCooldown && !shotInFlight && chargeHud === null);

  const handleTurnTimeout = useCallback(async () => {
    if (forfeitOnceRef.current) return;
    if (turnSubmitPendingRef.current) return;
    if (shotInFlight || enemyLossAnimating) return;
    forfeitOnceRef.current = true;
    const rid = room?.id;
    if (!rid || !userId) {
      forfeitOnceRef.current = false;
      return;
    }
    const spawn = snapBlockCenterToGrid([...gameSpawnRef.current] as Vec3);
    turnSubmitPendingRef.current = true;
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.rpc("submit_pvp_shot", {
        p_room_id: rid,
        p_outcome: "penalty",
        p_spawn_x: Math.round(spawn[0]),
        p_spawn_y: Math.round(spawn[1]),
        p_spawn_z: Math.round(spawn[2]),
      });
      if (error) {
        pushHudToast(error.message);
        return;
      }
      playSfx(SFX.errorBip);
      setCageEscapeNextShot(false);
      dispatch({
        type: "PROJECTILE_END",
        outcome: "penalty",
        revertSpawn: [...gameSpawnRef.current] as Vec3,
      });
      pushHudToast("Time's up — turn forfeited");
      setCooldownUntil(performance.now() + vehicleShotCooldownMs(playerVehicle));
      await refreshRoom();
    } finally {
      turnSubmitPendingRef.current = false;
      forfeitOnceRef.current = false;
    }
  }, [
    dispatch,
    enemyLossAnimating,
    playerVehicle,
    pushHudToast,
    refreshRoom,
    room?.id,
    shotInFlight,
    userId,
  ]);

  useEffect(() => {
    if (!isMyTurn) {
      turnDeadlineMsRef.current = null;
      pauseRemainingMsRef.current = null;
    } else if (!prevIsMyTurnRef.current) {
      turnDeadlineMsRef.current = Date.now() + PVP_PVE_TURN_TIME_LIMIT_MS;
      pauseRemainingMsRef.current = null;
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

  useEffect(() => {
    if (!isMyTurn) return;
    if (shotInFlight || enemyLossAnimating) {
      if (turnDeadlineMsRef.current !== null) {
        pauseRemainingMsRef.current = Math.max(
          0,
          turnDeadlineMsRef.current - Date.now()
        );
        turnDeadlineMsRef.current = null;
      }
    } else if (pauseRemainingMsRef.current !== null) {
      turnDeadlineMsRef.current =
        Date.now() + pauseRemainingMsRef.current;
      pauseRemainingMsRef.current = null;
    }
  }, [isMyTurn, shotInFlight, enemyLossAnimating]);

  useEffect(() => {
    if (!bothPlayersReady || matchOver) return;
    const id = window.setInterval(() => {
      setTurnTimerTick((t) => t + 1);
      if (
        !isMyTurn ||
        shotInFlight ||
        enemyLossAnimating ||
        turnSubmitPendingRef.current
      ) {
        return;
      }
      const d = turnDeadlineMsRef.current;
      if (d !== null && Date.now() >= d) {
        void handleTurnTimeout();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [
    bothPlayersReady,
    matchOver,
    isMyTurn,
    shotInFlight,
    enemyLossAnimating,
    handleTurnTimeout,
  ]);

  const turnRemainingMs =
    isMyTurn &&
    bothPlayersReady &&
    !matchOver &&
    !waitingForOpponent
      ? (() => {
          void turnTimerTick;
          return turnDeadlineMsRef.current !== null
            ? Math.max(0, turnDeadlineMsRef.current - Date.now())
            : pauseRemainingMsRef.current !== null
              ? pauseRemainingMsRef.current
              : null;
        })()
      : null;

  if (!initialFetchDone) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: SKY_GRADIENT_CSS, color: "#0a5f8a" }}
      >
        Loading room…
      </div>
    );
  }

  if (roomError) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
        style={{ background: SKY_GRADIENT_CSS, color: "#0a5f8a" }}
      >
        <p>{roomError}</p>
        <button type="button" onClick={goToPlaza} style={goldChipButtonStyle()}>
          Back to plaza
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: SKY_GRADIENT_CSS,
      }}
    >
      {matchOver && room && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 23, 42, 0.45)",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              ...hudMiniPanel,
              ...hudFont,
              padding: 20,
              maxWidth: 360,
              textAlign: "center",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>
              {room.winner_user_id === userId ? "You won!" : "You lost"}
            </h2>
            <p style={{ margin: "0 0 16px", opacity: 0.85 }}>
              {(room?.match_mode ?? "pvp") === "pve"
                ? "First to reach the pyramid wins."
                : "First to hit the opponent's vehicle wins."}
            </p>
            <button type="button" onClick={goToPlaza} style={goldChipButtonStyle()}>
              Back to plaza
            </button>
          </div>
        </div>
      )}

      {waitingForOpponent && !matchOver && room && (
        <div
          style={{
            position: "absolute",
            top: 56,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 55,
            ...hudMiniPanel,
            ...hudFont,
            padding: "8px 14px",
          }}
        >
          Waiting for opponent to join…
        </div>
      )}

      {bothPlayersReady && !matchOver && room && (
        <div
          style={{
            position: "absolute",
            top: 56,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 55,
            ...hudMiniPanel,
            ...hudFont,
            padding: "8px 14px",
            textAlign: "center",
          }}
        >
          {isMyTurn ? (
            <>
              Your turn
              {turnRemainingMs !== null ? (
                <span style={{ marginLeft: 8, opacity: 0.95 }}>
                  · {formatPvpTurnClock(turnRemainingMs)}
                </span>
              ) : null}
            </>
          ) : (
            "Opponent's turn"
          )}
        </div>
      )}

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
            roundLocked={roundLocked}
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
            onTerrainCoordsClick={() => {}}
            ballFollowStateRef={ballFollowStateRef}
            broadcastUserId={userId ?? null}
            onBroadcastLocalShot={broadcastShot}
            remoteGhostShotPayload={incomingGhostShot}
            onRemoteGhostShotConsumed={clearIncomingGhostShot}
            onEnemyLossAnimatingChange={setEnemyLossAnimating}
            equippedHatId={shopInventory.equippedHatId}
            equippedFishId={shopInventory.equippedFishId}
            mapCages={game.mapCages}
            goalCagesBroken={goalCagesBroken}
            cageEscapeNextShot={cageEscapeNextShot}
            onCageTrapped={onCageTrapped}
            onBreakGoalCageFromShot={onBreakGoalCageFromShot}
            powerupVehicleBurstSeq={powerupVehicleBurst.seq}
            powerupVehicleBurstSlot={powerupVehicleBurst.slot}
            pvpMode={!isPve}
            pvpOpponentVehicle={opponentVehicle}
            pvpOpponentWorldPos={pvpOpponentWorldPos}
            pvpOpponentFacingToward={game.spawnCenter}
            pveOpponentVehicle={isPve ? opponentVehicle : null}
            pveOpponentWorldPos={isPve ? pvpOpponentWorldPos : null}
            pveOpponentFacingToward={isPve ? game.spawnCenter : null}
            goalEnemies={isPve ? [] : [...PVP_OPPONENT_ENEMY]}
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
        onScoreClick={() => {}}
        rendererStatsRef={rendererStatsRef}
        onOpenProfile={() => {
          if (enemyLossAnimating) return;
          setShowProfileModal(true);
        }}
        profileButtonDisabled={enemyLossAnimating}
      />
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 42,
          display: "flex",
          gap: 8,
          transform: "translateZ(0)",
        }}
      >
        {room?.id && initialFetchDone ? (
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
            }}
          >
            <button
              type="button"
              onClick={() => setShowLeaveRoomConfirm(true)}
              style={goldChipButtonGroupLeftDangerStyle()}
            >
              Leave room
            </button>
            <MatchChatPanel
              chatText={room.chat_text ?? ""}
              onSend={sendMatchChat}
              onPoll={pollRoomForChat}
              disabled={!userId}
              chatButtonStyle={goldChipButtonGroupRightStyle()}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLeaveRoomConfirm(true)}
            style={dangerChipButtonStyle()}
          >
            Leave room
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
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
          pointerEvents: "none",
          transform: "translateZ(0)",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <WindHud windHud={windHud} />
        </div>
      </div>

      {showHelpModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            background: "rgba(15,23,42,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ ...hudMiniPanel, ...hudFont, padding: 16, maxWidth: 320 }}>
            <p style={{ marginTop: 0 }}>
              {(room?.match_mode ?? "pvp") === "pve"
                ? "PvE race — same course, no contact between players. Shoot when it’s your turn; first to the pyramid wins."
                : "Turn-based PvP — shoot when it’s your turn."}
            </p>
            <button type="button" onClick={goToPlaza} style={goldChipButtonStyle()}>
              Leave to plaza
            </button>
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              style={{ ...goldChipButtonStyle(), marginLeft: 8 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showLeaveRoomConfirm && (
        <div
          role="presentation"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 60,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            boxSizing: "border-box",
          }}
          onClick={() => setShowLeaveRoomConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-room-confirm-title"
            style={{ ...hudMiniPanel, ...hudFont, padding: 16, maxWidth: 340 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p id="leave-room-confirm-title" style={{ marginTop: 0, fontWeight: 800 }}>
              Leave room?
            </p>
            <p style={{ marginTop: 8, marginBottom: 14, color: hudColors.value }}>
              You will return to the plaza. You can join again from multiplayer if the room is still open.
            </p>
            <button type="button" onClick={() => setShowLeaveRoomConfirm(false)} style={goldChipButtonStyle()}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLeaveRoomConfirm(false);
                leavePvpRoom();
              }}
              style={{ ...dangerChipButtonStyle(), marginLeft: 8 }}
            >
              Leave room
            </button>
          </div>
        </div>
      )}

      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentVehicleId={playerVehicle.id}
      />

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
            onClick={() => {
              if (powerupMenuLocked) return;
              setShowPowerupMenu((v) => !v);
            }}
            style={hudRoundPowerupButtonStyle(powerupMenuLocked)}
          >
            Power-ups
          </button>
          {powerupMenuOpen && (
            <div
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
                pointerEvents: "auto",
              }}
            >
              <PowerupSlotRow
                strengthCharges={strengthCharges}
                noBounceCharges={noBounceCharges}
                noWindCharges={noWindCharges}
                canUseStrength={strengthCharges > 0}
                canUseNoBounce={noBounceCharges > 0 && !noBounceActive}
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
                disabled={roundLocked}
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
                disabled={roundLocked}
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
                    inCooldown ||
                    enemyLossAnimating ||
                    roundLocked
                  }
                  style={hudRoundFireButtonStyle(
                    shotInFlight ||
                      inCooldown ||
                      enemyLossAnimating ||
                      roundLocked
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
                      inCooldown ||
                      enemyLossAnimating ||
                      roundLocked;
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
                    inCooldown ||
                    enemyLossAnimating ||
                    roundLocked
                  }
                  style={hudRoundFireButtonStyle(
                    shotInFlight ||
                      inCooldown ||
                      enemyLossAnimating ||
                      roundLocked
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
      </div>
    </div>
  );
}
