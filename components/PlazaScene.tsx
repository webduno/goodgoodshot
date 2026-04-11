"use client";

import { ToastNotif } from "@/components/ToastNotif";
import { usePlayerStats } from "@/components/PlayerStatsProvider";
import { HelpModal } from "@/components/game/cube/modals/HelpModal";
import { PvpJoinRoomModal } from "@/components/game/cube/modals/PvpJoinRoomModal";
import { ProfileModal } from "@/components/game/cube/modals/ProfileModal";
import { AquariumShopModal } from "@/components/game/cube/modals/AquariumShopModal";
import { BirdShopModal } from "@/components/game/cube/modals/BirdShopModal";
import { ShopModal } from "@/components/game/cube/modals/ShopModal";
import { AimHud } from "@/components/game/cube/hud/AimHud";
import { AimPadHud } from "@/components/game/cube/hud/AimPadHud";
import { PowerupSlotRow } from "@/components/game/cube/hud/PowerupSlotRow";
import { GuidelinePreviewPowerSlider } from "@/components/game/cube/hud/GuidelinePreviewPowerSlider";
import { FirePowerVerticalHud, ShotHud } from "@/components/game/cube/hud/ShotHud";
import { StatsHud } from "@/components/game/cube/hud/StatsHud";
import { InitialFieldGround } from "@/components/game/cube/meshes/InitialFieldGround";
import { PlazaShopBuilding } from "@/components/game/cube/meshes/PlazaShopBuilding";
import { PlazaHubRoads } from "@/components/game/cube/meshes/PlazaHubRoads";
import { PlazaFrutigerAeroDecor } from "@/components/game/cube/meshes/PlazaFrutigerAeroDecor";
import { PlazaHillDecorIslands } from "@/components/game/cube/meshes/PlazaHillDecorIslands";
import { SkyClouds } from "@/components/game/cube/meshes/SkyClouds";
import { SkySun } from "@/components/game/cube/meshes/SkySun";
import { PlazaPortalTorus } from "@/components/game/cube/meshes/PlazaWarPortalTorus";
import { RetroTvPostFx } from "@/components/game/cube/effects/RetroTvPostFx";
import {
  RendererStatsCollector,
  type RendererStatsSnapshot,
} from "@/components/game/cube/RendererStatsCollector";
import { SceneContent } from "@/components/game/cube/SceneContent";
import { TeleportOrbitRig } from "@/components/game/cube/TeleportOrbitRig";
import { StaticSceneLights } from "@/components/game/cube/StaticSceneLights";
import { PlazaHubFillLights } from "@/components/game/cube/meshes/PlazaHubFillLights";
import {
  goldChipButtonStyle,
  goldIconButtonStyle,
  hudBottomPanel,
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
import { isVehicleUnlocked, resolvePlayerVehicle } from "@/lib/game/vehicleUnlock";
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
  SKY_GRADIENT_CSS,
  PLAZA_FAKE_GOAL_CENTER,
  PLAZA_WAR_PORTAL_BATTLE_COUNT,
} from "@/lib/game/constants";
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
  snapBlockCenterToGrid,
  wrapYawRad,
} from "@/lib/game/math";
import {
  PLAZA_HUB_ISLANDS,
  PLAZA_HUB_TURF_GREEN,
  PLAZA_PORTAL_ORBIT,
  PLAZA_VIBE_JAM_PORTAL_EXIT_X,
  PLAZA_VIBE_JAM_PORTAL_EXIT_Z,
  PLAZA_VIBE_JAM_PORTAL_RETURN_X,
  PLAZA_VIBE_JAM_PORTAL_RETURN_Z,
  PLAZA_VIBE_JAM_SPAWN_X,
  PLAZA_VIBE_JAM_SPAWN_Z,
  plazaVibeJamExitRotationY,
  plazaVibeJamReturnRotationY,
} from "@/lib/game/plazaHub";
import {
  buildPlazaCanonicalRefUrl,
  buildVibeJamExitUrl,
  buildVibeJamReturnNavigationUrl,
  rgbTupleToHex,
} from "@/lib/game/vibeJamPortal";
import {
  AQUARIUM_SHOP_ITEMS,
  FISH_SHOP_ITEMS,
} from "@/lib/shop/aquariumCatalog";
import { BIRD_SHOP_ITEMS } from "@/lib/shop/birdCatalog";
import { HAT_CATALOG } from "@/lib/shop/hatCatalog";
import { VEHICLE_SHOP_CATALOG } from "@/lib/shop/vehicleCatalog";
import {
  isNearPlazaAquariumShop,
  isNearPlazaBirdShop,
  isNearPlazaShop,
} from "@/lib/shop/plazaShopConstants";
import { useFreeShopClaims } from "@/lib/shop/useFreeShopClaims";
import { usePlayerShopInventory } from "@/lib/shop/usePlayerShopInventory";
import type {
  AquariumId,
  FishId,
  HatId,
  PlazaBirdId,
} from "@/lib/shop/playerInventory";
import { startWarSessionAndRedirectHome } from "@/lib/game/startWarSession";
import {
  createPvpRoom,
  joinFirstOpenPvpRoom,
  joinPvpRoomById,
} from "@/lib/pvp/plazaActions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { playSfx, SFX } from "@/lib/sfx/sfxPlayer";
import { type PowerupSlotId, type Vec3 } from "@/lib/game/types";
import { Canvas } from "@react-three/fiber";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

async function ensureSupabaseSession(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) return;

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    const message =
      typeof error.message === "string" ? error.message : "sign-in failed";
    if (message.includes("anonymous_provider_disabled")) {
      throw new Error(
        "Anonymous sign-ins are disabled in Supabase. Enable Auth > Providers > Anonymous."
      );
    }
    throw new Error(message);
  }

  const {
    data: { session: nextSession },
  } = await supabase.auth.getSession();
  if (!nextSession) {
    throw new Error("Sign-in did not create a session");
  }
}

export default function PlazaScene() {
  const { spendGoldCoin, spendGoldCoins, recordGoldCoins, stats } =
    usePlayerStats();
  const {
    inventory: shopInventory,
    setStrengthCharges,
    setNoBounceCharges,
    setNoWindCharges,
    setEquippedHatId,
    setEquippedFishId,
    addOwnedHat,
    addOwnedVehicle,
    addOwnedFish,
    addOwnedPlazaBird,
    addOwnedAquarium,
  } = usePlayerShopInventory();
  const {
    canClaimThreeCoinBag,
    threeCoinBagRemainingMs,
    tryClaimThreeCoinBag,
  } = useFreeShopClaims(recordGoldCoins);
  const strengthCharges = shopInventory.strengthCharges;
  const noBounceCharges = shopInventory.noBounceCharges;
  const noWindCharges = shopInventory.noWindCharges;
  const searchParams = useSearchParams();
  const router = useRouter();
  const vehicleParam = searchParams.get("vehicle");
  const playerVehicle = useMemo(
    () =>
      resolvePlayerVehicle(vehicleParam, stats, shopInventory.ownedVehicleIds),
    [vehicleParam, stats, shopInventory.ownedVehicleIds]
  );

  const [pvpLobbyBusy, setPvpLobbyBusy] = useState(false);

  const vibeJamPortalSpawn = useMemo((): Vec3 => {
    if (
      searchParams.get("portal") === "true" &&
      searchParams.get("ref")
    ) {
      return snapBlockCenterToGrid([
        PLAZA_VIBE_JAM_SPAWN_X,
        0,
        PLAZA_VIBE_JAM_SPAWN_Z,
      ]) as Vec3;
    }
    return [0, 0, 0];
  }, [searchParams]);

  const [spawnCenter, setSpawnCenter] = useState<Vec3>(vibeJamPortalSpawn);
  const spawnCenterRef = useRef<Vec3>(spawnCenter);
  spawnCenterRef.current = spawnCenter;
  /** Spawn before the current shot (for penalty revert / hit row), matching main `CubeScene`. */
  const spawnBeforeShotRef = useRef<Vec3>([0, 0, 0]);
  const goalCenter = useMemo(
    (): Vec3 => [
      PLAZA_FAKE_GOAL_CENTER[0],
      PLAZA_FAKE_GOAL_CENTER[1],
      PLAZA_FAKE_GOAL_CENTER[2],
    ],
    []
  );
  const islands = PLAZA_HUB_ISLANDS;

  const [aimYawRad, setAimYawRad] = useState(0);
  const [aimSideYawRad, setAimSideYawRad] = useState(0);
  const [aimPitchOffsetRad, setAimPitchOffsetRad] = useState(0);
  const aimYawRef = useRef(0);
  aimYawRef.current = aimYawRad;
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [shotInFlight, setShotInFlight] = useState(false);
  const [followBallCamera, setFollowBallCamera] = useState(true);
  const ballFollowStateRef = useRef({
    pos: new THREE.Vector3(),
    valid: false,
    vx: 0,
    vy: 0,
    vz: 0,
  });

  const vibeJamIncomingParamsRef = useRef<URLSearchParams | null>(null);
  if (searchParams.get("portal") === "true") {
    vibeJamIncomingParamsRef.current = new URLSearchParams(
      searchParams.toString()
    );
  } else {
    vibeJamIncomingParamsRef.current = null;
  }

  useEffect(() => {
    setSpawnCenter(vibeJamPortalSpawn);
  }, [vibeJamPortalSpawn]);
  const rendererStatsRef = useRef<RendererStatsSnapshot | null>(null);
  const [sessionShots, setSessionShots] = useState(0);

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [retroTvEnabled, setRetroTvEnabled] = useState(false);
  const [guidelineEnabled, setGuidelineEnabled] = useState(true);
  const [aimControlMode, setAimControlMode] = useState<AimControlMode>("pad");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showAquariumShopModal, setShowAquariumShopModal] = useState(false);
  const [showBirdShopModal, setShowBirdShopModal] = useState(false);
  const [showPvpJoinModal, setShowPvpJoinModal] = useState(false);

  useEffect(() => {
    setRetroTvEnabled(loadRetroTvEnabled());
  }, []);
  useEffect(() => {
    setGuidelineEnabled(loadGuidelineEnabled());
  }, []);
  useEffect(() => {
    setAimControlMode(loadAimControlMode());
  }, []);

  const [showPowerupMenu, setShowPowerupMenu] = useState(false);
  const [hudToastToken, setHudToastToken] = useState(0);
  const [hudToastMessage, setHudToastMessage] = useState("");
  const [hudToastAccent, setHudToastAccent] = useState<
    "strength" | "noBounce" | "nowind" | "guideline" | undefined
  >(undefined);
  const fireHeldRef = useRef<((held: boolean) => void) | null>(null);
  const guidelineShootRef = useRef<(() => void) | null>(null);
  const guidelineSpacePowerRepeatRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);

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

  const onPvpCreateRoom = useCallback(async () => {
    if (pvpLobbyBusy) return;
    setPvpLobbyBusy(true);
    try {
      await ensureSupabaseSession();
      const id = await createPvpRoom();
      const p = new URLSearchParams();
      const v = searchParams.get("vehicle");
      if (v) p.set("vehicle", v);
      const qs = p.toString();
      router.push(qs ? `/pvp/${id}?${qs}` : `/pvp/${id}`);
    } catch (e) {
      pushHudToast(getErrorMessage(e, "PvP setup failed"));
    } finally {
      setPvpLobbyBusy(false);
    }
  }, [pvpLobbyBusy, searchParams, router, pushHudToast]);

  const onPvpQuickPlay = useCallback(async () => {
    if (pvpLobbyBusy) return;
    setPvpLobbyBusy(true);
    try {
      await ensureSupabaseSession();
      const id = await joinFirstOpenPvpRoom();
      if (!id) {
        pushHudToast("No open room — create one");
        return;
      }
      const p = new URLSearchParams();
      const v = searchParams.get("vehicle");
      if (v) p.set("vehicle", v);
      const qs = p.toString();
      router.push(qs ? `/pvp/${id}?${qs}` : `/pvp/${id}`);
    } catch (e) {
      pushHudToast(getErrorMessage(e, "PvP join failed"));
    } finally {
      setPvpLobbyBusy(false);
    }
  }, [pvpLobbyBusy, searchParams, router, pushHudToast]);

  const onPvpJoinRoomFromList = useCallback(
    async (roomId: string) => {
      if (pvpLobbyBusy) return;
      setPvpLobbyBusy(true);
      try {
        await ensureSupabaseSession();
        await joinPvpRoomById(roomId);
        const p = new URLSearchParams();
        const v = searchParams.get("vehicle");
        if (v) p.set("vehicle", v);
        const qs = p.toString();
        setShowPvpJoinModal(false);
        router.push(qs ? `/pvp/${roomId}?${qs}` : `/pvp/${roomId}`);
      } catch (e) {
        pushHudToast(getErrorMessage(e, "Could not join room"));
      } finally {
        setPvpLobbyBusy(false);
      }
    },
    [pvpLobbyBusy, searchParams, router, pushHudToast]
  );

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

  const [chargeHud, setChargeHud] = useState<{
    remainingMs: number;
    clicks: number;
  } | null>(null);
  const [guidelinePreviewClicks, setGuidelinePreviewClicks] = useState(() =>
    halfClicksForStrengthBarRef(DEFAULT_PLAYER_VEHICLE)
  );
  const [, setHudTick] = useState(0);

  const collectedCoinKeysRef = useRef(new Set<string>());
  const [coinRenderTick, setCoinRenderTick] = useState(0);

  const powerupStackRef = useRef(0);
  const noBounceRef = useRef(false);
  const noWindRef = useRef(false);
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
    setAimPitchOffsetRad(0);
  }, [playerVehicle.id]);

  const onCoinCollected = useCallback((_key: string) => {
    setCoinRenderTick((t) => t + 1);
  }, []);

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

  const prepareShotWind = useCallback(() => ({ ax: 0, az: 0 }), []);

  const activatePowerup = useCallback(
    (slotId: PowerupSlotId) => {
      if (shotInFlight) return;

      if (slotId === "strength") {
        if (strengthChargesRef.current <= 0) return;
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
    [pushHudToast, shotInFlight, setStrengthCharges, setNoBounceCharges, setNoWindCharges]
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
    [spendGoldCoin, pushHudToast, setStrengthCharges, setNoBounceCharges, setNoWindCharges]
  );

  const buyHatFromShop = useCallback(
    (id: HatId) => {
      if (shopInventory.ownedHats.includes(id)) return;
      const row = HAT_CATALOG.find((h) => h.id === id);
      if (!spendGoldCoin()) {
        pushHudToast("Need 1 coin");
        return;
      }
      addOwnedHat(id);
      playSfx(SFX.coinCollect);
      pushHudToast(row ? `Bought ${row.displayName}` : "Hat purchased");
    },
    [shopInventory.ownedHats, spendGoldCoin, pushHudToast, addOwnedHat]
  );

  const onClaimFreeCoinBag = useCallback(() => {
    if (!tryClaimThreeCoinBag()) return;
    playSfx(SFX.coinCollect);
    pushHudToast("+3 coins");
  }, [tryClaimThreeCoinBag, pushHudToast]);

  const buyVehicleFromShop = useCallback(
    (vehicleId: string) => {
      const id = vehicleId.trim().toLowerCase();
      if (shopInventory.ownedVehicleIds.includes(id)) return;
      const row = VEHICLE_SHOP_CATALOG.find(
        (v) => v.id.trim().toLowerCase() === id
      );
      const price = row?.priceCoins ?? 0;
      if (!spendGoldCoins(price)) {
        pushHudToast(`Need ${price} coins`);
        return;
      }
      addOwnedVehicle(id);
      playSfx(SFX.coinCollect);
      pushHudToast(row ? `Bought ${row.displayName}` : "Vehicle purchased");
    },
    [
      shopInventory.ownedVehicleIds,
      spendGoldCoins,
      pushHudToast,
      addOwnedVehicle,
    ]
  );

  const buyFishFromAquariumShop = useCallback(
    (id: FishId) => {
      if (shopInventory.ownedFishIds.includes(id)) return;
      const row = FISH_SHOP_ITEMS.find((f) => f.id === id);
      const price = row?.priceCoins ?? 1;
      if (!spendGoldCoins(price)) {
        pushHudToast(`Need ${price} coin${price === 1 ? "" : "s"}`);
        return;
      }
      addOwnedFish(id);
      playSfx(SFX.coinCollect);
      pushHudToast(row ? `Bought ${row.label}` : "Fish purchased");
    },
    [shopInventory.ownedFishIds, spendGoldCoins, pushHudToast, addOwnedFish]
  );

  const buyAquariumFromShop = useCallback(
    (id: AquariumId) => {
      if (shopInventory.ownedAquariumIds.includes(id)) return;
      const row = AQUARIUM_SHOP_ITEMS.find((a) => a.id === id);
      const price = row?.priceCoins ?? 1;
      if (!spendGoldCoins(price)) {
        pushHudToast(`Need ${price} coins`);
        return;
      }
      addOwnedAquarium(id);
      playSfx(SFX.coinCollect);
      pushHudToast(row ? `Bought ${row.label}` : "Aquarium purchased");
    },
    [
      shopInventory.ownedAquariumIds,
      spendGoldCoins,
      pushHudToast,
      addOwnedAquarium,
    ]
  );

  const buyBirdFromBirdShop = useCallback(
    (id: PlazaBirdId) => {
      if (shopInventory.ownedPlazaBirdIds.includes(id)) return;
      const row = BIRD_SHOP_ITEMS.find((b) => b.id === id);
      const price = row?.priceCoins ?? 1;
      if (!spendGoldCoins(price)) {
        pushHudToast(`Need ${price} coin${price === 1 ? "" : "s"}`);
        return;
      }
      addOwnedPlazaBird(id);
      playSfx(SFX.coinCollect);
      pushHudToast(row ? `Bought ${row.label}` : "Bird purchased");
    },
    [
      shopInventory.ownedPlazaBirdIds,
      spendGoldCoins,
      pushHudToast,
      addOwnedPlazaBird,
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
    spawnBeforeShotRef.current = [...spawnCenterRef.current] as Vec3;
    setShotInFlight(true);
    burstShotGreyConfetti();
    setSessionShots((n) => n + 1);
  }, []);

  const onWarPortalEnter = useCallback(() => {
    startWarSessionAndRedirectHome(PLAZA_WAR_PORTAL_BATTLE_COUNT, "random");
  }, []);

  const onHomePortalEnter = useCallback(() => {
    const v = searchParams.get("vehicle");
    router.push(v ? `/?vehicle=${encodeURIComponent(v)}` : "/");
  }, [router, searchParams]);

  const onNineBattlePortalEnter = useCallback(() => {
    startWarSessionAndRedirectHome(9, "random");
  }, []);

  const onFiveBattlePortalEnter = useCallback(() => {
    startWarSessionAndRedirectHome(5, "random");
  }, []);

  const cameFromVibePortal = useMemo(
    () =>
      searchParams.get("portal") === "true" &&
      Boolean(searchParams.get("ref")),
    [searchParams]
  );

  const onVibeJamExitPortalEnter = useCallback(() => {
    if (typeof window === "undefined") return;
    const st = ballFollowStateRef.current;
    const speed = st.valid ? Math.hypot(st.vx, st.vy, st.vz) : 0;
    const refUrl = buildPlazaCanonicalRefUrl({
      origin: window.location.origin,
      pathname: window.location.pathname,
      vehicleId: searchParams.get("vehicle"),
    });
    const url = buildVibeJamExitUrl({
      username: playerVehicle.name.slice(0, 64),
      colorHex: rgbTupleToHex(
        playerVehicle.mainRgb[0],
        playerVehicle.mainRgb[1],
        playerVehicle.mainRgb[2]
      ),
      speedMps: speed,
      refUrl,
    });
    window.location.href = url;
  }, [playerVehicle, searchParams]);

  const onVibeJamReturnPortalEnter = useCallback(() => {
    const ref = searchParams.get("ref");
    if (!ref || typeof window === "undefined") return;
    const currentGameRefUrl = buildPlazaCanonicalRefUrl({
      origin: window.location.origin,
      pathname: window.location.pathname,
      vehicleId: searchParams.get("vehicle"),
    });
    const url = buildVibeJamReturnNavigationUrl({
      previousGameRef: ref,
      incomingParams: vibeJamIncomingParamsRef.current ?? new URLSearchParams(),
      currentGameRefUrl,
      baseOrigin: window.location.origin,
    });
    if (url) window.location.href = url;
  }, [searchParams]);

  const onProjectileEnd = useCallback(
    (outcome: "hit" | "miss" | "penalty" | "enemy_loss", landing?: Vec3) => {
      setShotInFlight(false);
      const prev = spawnBeforeShotRef.current;
      if (outcome === "penalty") {
        pushHudToast("Out of bounds");
        setSpawnCenter(snapBlockCenterToGrid(prev));
      } else if (outcome === "miss" && landing) {
        setSpawnCenter(snapBlockCenterToGrid(landing));
        const hub = PLAZA_HUB_ISLANDS[0]!;
        if (isNearPlazaShop(landing[0], landing[2])) {
          setShowShopModal(true);
        } else if (
          isNearPlazaAquariumShop(
            landing[0],
            landing[2],
            hub.worldX,
            hub.worldZ
          )
        ) {
          setShowAquariumShopModal(true);
        } else if (
          isNearPlazaBirdShop(
            landing[0],
            landing[2],
            hub.worldX,
            hub.worldZ
          )
        ) {
          setShowBirdShopModal(true);
        }
      } else if (outcome === "hit" || outcome === "enemy_loss") {
        setSpawnCenter(
          snapBlockCenterToGrid([prev[0], prev[1], goalCenter[2]])
        );
      }
      setCooldownUntil(performance.now() + vehicleShotCooldownMs(playerVehicle));
    },
    [goalCenter, playerVehicle, pushHudToast]
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
    if (!showShopModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowShopModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showShopModal]);

  useEffect(() => {
    if (!showAquariumShopModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAquariumShopModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAquariumShopModal]);

  useEffect(() => {
    if (!showBirdShopModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowBirdShopModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showBirdShopModal]);

  useEffect(() => {
    if (
      shotInFlight ||
      showHelpModal ||
      showProfileModal ||
      showShopModal ||
      showAquariumShopModal ||
      showBirdShopModal ||
      showPvpJoinModal
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
        if (shotInFlight || inCooldown) return;
        if (e.repeat) return;
        e.preventDefault();
        guidelineShootRef.current?.();
        return;
      }
      if (k === " " || e.code === "Space") {
        if (shotInFlight || inCooldown) {
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
    showHelpModal,
    showProfileModal,
    showShopModal,
    showAquariumShopModal,
    showBirdShopModal,
    showPvpJoinModal,
    inCooldown,
    chargeHud,
    activatePowerup,
    guidelineAdjusting,
    playerVehicle,
    clearGuidelineSpacePowerRepeat,
  ]);

  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== " " && e.code !== "Space") return;
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

  const powerupMenuLocked = chargeHud !== null || shotInFlight;
  const powerupMenuOpen = showPowerupMenu && !powerupMenuLocked;

  const remainingCooldownMs =
    cooldownUntil !== null ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const inCooldownActive =
    cooldownUntil !== null && remainingCooldownMs > 0;
  const showShotHudPanel =
    (chargeHud !== null && !shotInFlight) ||
    (inCooldownActive && !shotInFlight && chargeHud === null);

  const roundLocked =
    showHelpModal ||
    showProfileModal ||
    showShopModal ||
    showAquariumShopModal ||
    showBirdShopModal ||
    showPvpJoinModal;

  const modalBlocksHud =
    showHelpModal ||
    showProfileModal ||
    showShopModal ||
    showAquariumShopModal ||
    showBirdShopModal ||
    showPvpJoinModal;

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
        <StaticSceneLights omitGoalDirectional />
        <PlazaHubFillLights />
        <SkyClouds />
        <SkySun />
        <TeleportOrbitRig
          gameSpawn={spawnCenter}
          followBallActive={followBallCamera}
          ballFollowStateRef={ballFollowStateRef}
        >
          <SceneContent
            spawnCenter={spawnCenter}
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
            guidelineActiveNextShot={guidelineArmed}
            onGuidelineConsumedForShot={onGuidelineConsumedForShot}
            chargeHudForGuideline={chargeHud}
            guidelinePreviewClicks={guidelinePreviewClicks}
            guidelineFireBlocked={guidelineAdjusting}
            biome="plain"
            ballFollowStateRef={ballFollowStateRef}
            goalEnemies={[]}
            hubMode
            equippedHatId={shopInventory.equippedHatId}
            equippedFishId={shopInventory.equippedFishId}
            powerupVehicleBurstSeq={powerupVehicleBurst.seq}
            powerupVehicleBurstSlot={powerupVehicleBurst.slot}
          />
        </TeleportOrbitRig>
        <InitialFieldGround
          islands={islands}
          biome="plain"
          turfColorOverride={PLAZA_HUB_TURF_GREEN}
        />
        <PlazaHillDecorIslands />
        <PlazaHubRoads />
        <PlazaFrutigerAeroDecor
          wx={islands[0]!.worldX}
          wz={islands[0]!.worldZ}
          walk={islands[0]!.walkableHalfX ?? islands[0]!.halfX}
          outer={islands[0]!.halfX}
          onPointerDownAquariumShop={() => setShowAquariumShopModal(true)}
          onPointerDownBirdShop={() => setShowBirdShopModal(true)}
        />
        <PlazaShopBuilding onPointerDownOpen={() => setShowShopModal(true)} />
        <PlazaPortalTorus
          worldX={0}
          worldZ={PLAZA_PORTAL_ORBIT}
          label={`${PLAZA_WAR_PORTAL_BATTLE_COUNT} Battle War`}
          ballFollowStateRef={ballFollowStateRef}
          shotInFlight={shotInFlight}
          onBallEnter={onWarPortalEnter}
        />
        <PlazaPortalTorus
          worldX={0}
          worldZ={-PLAZA_PORTAL_ORBIT}
          rotationY={Math.PI}
          label="Home"
          ballFollowStateRef={ballFollowStateRef}
          shotInFlight={shotInFlight}
          onBallEnter={onHomePortalEnter}
        />
        <PlazaPortalTorus
          worldX={PLAZA_PORTAL_ORBIT}
          worldZ={0}
          rotationY={-Math.PI / 2}
          label="9 Battle War"
          ballFollowStateRef={ballFollowStateRef}
          shotInFlight={shotInFlight}
          onBallEnter={onNineBattlePortalEnter}
        />
        <PlazaPortalTorus
          worldX={-PLAZA_PORTAL_ORBIT}
          worldZ={0}
          rotationY={Math.PI / 2}
          label="5 Battle War"
          ballFollowStateRef={ballFollowStateRef}
          shotInFlight={shotInFlight}
          onBallEnter={onFiveBattlePortalEnter}
        />
        <PlazaPortalTorus
          worldX={PLAZA_VIBE_JAM_PORTAL_EXIT_X}
          worldZ={PLAZA_VIBE_JAM_PORTAL_EXIT_Z}
          rotationY={plazaVibeJamExitRotationY()}
          label="Vibe Jam Portal"
          ballFollowStateRef={ballFollowStateRef}
          shotInFlight={shotInFlight}
          onBallEnter={onVibeJamExitPortalEnter}
        />
        {cameFromVibePortal ? (
          <PlazaPortalTorus
            worldX={PLAZA_VIBE_JAM_PORTAL_RETURN_X}
            worldZ={PLAZA_VIBE_JAM_PORTAL_RETURN_Z}
            rotationY={plazaVibeJamReturnRotationY()}
            label="Vibe Jam Return"
            ballFollowStateRef={ballFollowStateRef}
            shotInFlight={shotInFlight}
            onBallEnter={onVibeJamReturnPortalEnter}
          />
        ) : null}
        <RetroTvPostFx enabled={retroTvEnabled} />
        <RendererStatsCollector statsRef={rendererStatsRef} />
      </Canvas>
      <ToastNotif
        showToken={hudToastToken}
        message={hudToastMessage}
        top={16}
        accent={hudToastAccent}
      />
      {!modalBlocksHud && (
        <StatsHud
          holePar={0}
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
          onScoreClick={() => setShowProfileModal(true)}
          rendererStatsRef={rendererStatsRef}
        />
      )}
      {!modalBlocksHud && (
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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignItems: "stretch",
            }}
          >
            <button
              type="button"
              disabled={pvpLobbyBusy}
              onClick={() => void onPvpCreateRoom()}
              style={goldChipButtonStyle()}
            >
              PvP: Create room
            </button>
            <button
              type="button"
              disabled={pvpLobbyBusy}
              onClick={() => {
                setShowProfileModal(false);
                setShowHelpModal(false);
                setShowPvpJoinModal(true);
              }}
              style={goldChipButtonStyle()}
            >
              PvP: Join room
            </button>
            <button
              type="button"
              disabled={pvpLobbyBusy}
              onClick={() => void onPvpQuickPlay()}
              style={goldChipButtonStyle()}
            >
              PvP: Quick play
            </button>
          </div>
        </div>
      )}
      {!modalBlocksHud && (
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
              aria-controls="plaza-powerup-precharge-panel"
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
            {powerupMenuOpen && (
              <div
                id="plaza-powerup-precharge-panel"
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
                    modalBlocksHud ||
                    inCooldown
                  }
                  style={hudRoundFireButtonStyle(
                    shotInFlight || modalBlocksHud || inCooldown
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
                      shotInFlight || modalBlocksHud || inCooldown;
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
                    shotInFlight || modalBlocksHud || inCooldown
                  }
                  style={hudRoundFireButtonStyle(
                    shotInFlight || modalBlocksHud || inCooldown
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
      )}
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
      <PvpJoinRoomModal
        open={showPvpJoinModal}
        onClose={() => setShowPvpJoinModal(false)}
        busy={pvpLobbyBusy}
        onJoinRoom={(roomId) => void onPvpJoinRoomFromList(roomId)}
      />
      <HelpModal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onOpenProfile={() => {
          setShowHelpModal(false);
          setShowProfileModal(true);
        }}
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
      <ShopModal
        open={showShopModal}
        onClose={() => setShowShopModal(false)}
        onOpenProfile={() => {
          setShowShopModal(false);
          setShowProfileModal(true);
        }}
        goldCoins={stats.totalGoldCoins}
        strengthCharges={strengthCharges}
        noBounceCharges={noBounceCharges}
        noWindCharges={noWindCharges}
        ownedHats={shopInventory.ownedHats}
        equippedHatId={shopInventory.equippedHatId}
        onBuyPowerupSlot={buyPowerupCharge}
        onBuyHat={buyHatFromShop}
        onEquipHat={setEquippedHatId}
        ownedVehicleIds={shopInventory.ownedVehicleIds}
        onBuyVehicle={buyVehicleFromShop}
        isVehicleUnlockedForPlayer={(id) =>
          isVehicleUnlocked(stats, id, shopInventory.ownedVehicleIds)
        }
        canClaimFreeCoinBag={canClaimThreeCoinBag}
        freeCoinBagRemainingMs={threeCoinBagRemainingMs}
        onClaimFreeCoinBag={onClaimFreeCoinBag}
      />
      <AquariumShopModal
        open={showAquariumShopModal}
        onClose={() => setShowAquariumShopModal(false)}
        goldCoins={stats.totalGoldCoins}
        ownedFishIds={shopInventory.ownedFishIds}
        equippedFishId={shopInventory.equippedFishId}
        onEquipFish={setEquippedFishId}
        ownedAquariumIds={shopInventory.ownedAquariumIds}
        onBuyFish={buyFishFromAquariumShop}
        onBuyAquarium={buyAquariumFromShop}
      />
      <BirdShopModal
        open={showBirdShopModal}
        onClose={() => setShowBirdShopModal(false)}
        goldCoins={stats.totalGoldCoins}
        ownedPlazaBirdIds={shopInventory.ownedPlazaBirdIds}
        onBuyBird={buyBirdFromBirdShop}
      />
    </div>
  );
}
