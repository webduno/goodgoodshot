"use client";

import { ToastNotif } from "@/components/ToastNotif";
import { usePlayerStats } from "@/components/PlayerStatsProvider";
import { FinishGameModal } from "@/components/game/cube/modals/FinishGameModal";
import { HelpModal } from "@/components/game/cube/modals/HelpModal";
import { ProfileModal } from "@/components/game/cube/modals/ProfileModal";
import { StartGameModal } from "@/components/game/cube/modals/StartGameModal";
import { AimHud } from "@/components/game/cube/hud/AimHud";
import { PowerupSlotRow } from "@/components/game/cube/hud/PowerupSlotRow";
import { ShotHud } from "@/components/game/cube/hud/ShotHud";
import { StatsHud } from "@/components/game/cube/hud/StatsHud";
import { InitialFieldGround } from "@/components/game/cube/meshes/InitialFieldGround";
import { SkyClouds } from "@/components/game/cube/meshes/SkyClouds";
import { SceneContent } from "@/components/game/cube/SceneContent";
import {
  TeleportOrbitRig,
} from "@/components/game/cube/TeleportOrbitRig";
import { StaticSceneLights } from "@/components/game/cube/StaticSceneLights";
import {
  goldChipButtonStyle,
  hudBottomPanel,
  hudFont,
} from "@/components/gameHudStyles";
import {
  resolveVehicleFromUrlParam,
  vehicleShotCooldownMs,
} from "@/components/playerVehicleConfig";
import { onCanvasCreated } from "@/lib/game/canvas";
import {
  AIM_YAW_QUARTER_TURN_RAD,
  AIM_YAW_STEP_RAD,
  BG,
  INITIAL_POWERUP_CHARGES,
} from "@/lib/game/constants";
import { createInitialGameState, gameReducer } from "@/lib/game/gameState";
import { wrapYawRad } from "@/lib/game/math";
import { stepWind } from "@/lib/game/wind";
import { INITIAL_LANE_ORIGIN, type PowerupSlotId, type Vec3 } from "@/lib/game/types";
import { Canvas } from "@react-three/fiber";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

export default function CubeScene() {
  const { recordHoleCompleted, recordGoldCoin, stats } = usePlayerStats();
  const searchParams = useSearchParams();
  const vehicleParam = searchParams.get("vehicle");
  const playerVehicle = useMemo(
    () => resolveVehicleFromUrlParam(vehicleParam),
    [vehicleParam]
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
  const gameSpawnRef = useRef<Vec3>(game.spawnCenter);
  gameSpawnRef.current = game.spawnCenter;
  const spawnBeforeShotRef = useRef<Vec3>(game.spawnCenter);

  const [aimYawRad, setAimYawRad] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [shotInFlight, setShotInFlight] = useState(false);
  const [sessionShots, setSessionShots] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showStartGameModal, setShowStartGameModal] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPowerupMenu, setShowPowerupMenu] = useState(false);
  const [hudToastToken, setHudToastToken] = useState(0);
  const [hudToastMessage, setHudToastMessage] = useState("");
  const [hudToastAccent, setHudToastAccent] = useState<
    "strength" | "noBounce" | "nowind" | undefined
  >(undefined);
  const fireInputRef = useRef<(() => void) | null>(null);

  const pushHudToast = useCallback(
    (
      message: string,
      accent?: "strength" | "noBounce" | "nowind"
    ) => {
      setHudToastMessage(message);
      setHudToastAccent(accent);
      setHudToastToken((t) => t + 1);
    },
    []
  );

  const onStartGame = useCallback(() => {
    setShowStartGameModal(false);
    pushHudToast(`Tap Fire to start`);
  }, [pushHudToast]);
  const [chargeHud, setChargeHud] = useState<{
    remainingMs: number;
    clicks: number;
  } | null>(null);
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
  const [powerupStackCount, setPowerupStackCount] = useState(0);
  const [noBounceActive, setNoBounceActive] = useState(false);
  const [noWindActive, setNoWindActive] = useState(false);
  const [windHud, setWindHud] = useState({ x: 0, z: 0 });
  const [strengthCharges, setStrengthCharges] = useState(INITIAL_POWERUP_CHARGES);
  const [noBounceCharges, setNoBounceCharges] = useState(INITIAL_POWERUP_CHARGES);
  const [noWindCharges, setNoWindCharges] = useState(INITIAL_POWERUP_CHARGES);
  strengthChargesRef.current = strengthCharges;
  noBounceChargesRef.current = noBounceCharges;
  noWindChargesRef.current = noWindCharges;
  const inCooldown = cooldownUntil !== null;
  const fireButtonDisabled =
    shotInFlight || showFinishModal || showStartGameModal || inCooldown;
  const fireButtonLabel = chargeHud === null ? "Fire" : `${chargeHud.clicks}`;

  useEffect(() => {
    windRef.current = stepWind();
    setWindHud({ x: windRef.current.x, z: windRef.current.z });
  }, [game.goalWorldX, game.goalWorldZ]);

  useEffect(() => {
    collectedCoinKeysRef.current.clear();
    setCoinRenderTick((t) => t + 1);
  }, [game.goalWorldX, game.goalWorldZ]);

  const onCoinCollected = useCallback(
    (key: string) => {
      if (collectedCoinKeysRef.current.has(key)) return;
      collectedCoinKeysRef.current.add(key);
      recordGoldCoin();
      setCoinRenderTick((t) => t + 1);
    },
    [recordGoldCoin]
  );

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
        return;
      }

      if (slotId === "nowind") {
        if (noWindRef.current) return;
        if (noWindChargesRef.current <= 0) return;
        noWindRef.current = true;
        setNoWindActive(true);
        setNoWindCharges((c) => (c <= 0 ? c : c - 1));
        pushHudToast(`"No wind" used`, "nowind");
      }
    },
    [pushHudToast, shotInFlight, showFinishModal]
  );

  const onChargeHudUpdate = useCallback(
    (next: { remainingMs: number; clicks: number } | null) => {
      setChargeHud(next);
    },
    []
  );

  const onChargeWindowStart = useCallback(() => {
    pushHudToast("Tap again to add power");
  }, [pushHudToast]);

  const bindFireInput = useCallback((handler: (() => void) | null) => {
    fireInputRef.current = handler;
  }, []);

  const onFireButtonPress = useCallback(() => {
    fireInputRef.current?.();
  }, []);

  const onShootStart = useCallback(() => {
    setShotInFlight(true);
    spawnBeforeShotRef.current = gameSpawnRef.current;
    setSessionShots((n) => n + 1);
  }, []);

  const onProjectileEnd = useCallback(
    (outcome: "hit" | "miss" | "penalty", landing?: Vec3) => {
      setShotInFlight(false);
      setWindHud({ x: windRef.current.x, z: windRef.current.z });
      if (outcome === "penalty") {
        waterPenaltiesRoundRef.current += 1;
        pushHudToast("Water hazard");
        dispatch({
          type: "PROJECTILE_END",
          outcome: "penalty",
          revertSpawn: [...spawnBeforeShotRef.current] as Vec3,
        });
      } else {
        if (outcome === "hit") {
          const g = gameRef.current;
          recordHoleCompleted({
            vehicleId: playerVehicle.id,
            shots: sessionShotsRef.current,
            ponds: g.ponds,
            goalWorldX: g.goalWorldX,
            goalWorldZ: g.goalWorldZ,
            strengthUses: strengthUsesRoundRef.current,
            noBounceUses: noBounceUsesRoundRef.current,
            waterPenaltiesThisRound: waterPenaltiesRoundRef.current,
          });
        }
        dispatch({
          type: "PROJECTILE_END",
          outcome,
          landing,
        });
      }
      if (outcome === "hit") {
        setShowFinishModal(true);
        return;
      }
      setCooldownUntil(performance.now() + vehicleShotCooldownMs(playerVehicle));
    },
    [playerVehicle, pushHudToast, recordHoleCompleted]
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
    if (showFinishModal) {
      setShowHelpModal(false);
      setShowProfileModal(false);
    }
  }, [showFinishModal]);

  useEffect(() => {
    if (!showHelpModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowHelpModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHelpModal]);

  useEffect(() => {
    if (chargeHud !== null) setShowPowerupMenu(false);
  }, [chargeHud]);

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

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: BG,
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
        <TeleportOrbitRig gameSpawn={game.spawnCenter}>
          <SceneContent
            spawnCenter={game.spawnCenter}
            goalCenter={goalCenter}
            ponds={game.ponds}
            aimYawRad={aimYawRad}
            cooldownUntil={cooldownUntil}
            roundLocked={showFinishModal || showStartGameModal}
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
            onBindFireInput={bindFireInput}
          />
        </TeleportOrbitRig>
        {/** Draw after scene content so the green turf sits on top of `TerrainTextured`. */}
        <InitialFieldGround />
      </Canvas>
      <ToastNotif
        showToken={hudToastToken}
        message={hudToastMessage}
        top={16}
        accent={hudToastAccent}
      />
      {!showStartGameModal && (
        <StatsHud
          spawnCenter={game.spawnCenter}
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
          windHud={windHud}
          vehicle={playerVehicle}
          totalGoldCoins={stats.totalGoldCoins}
        />
      )}
      {!showFinishModal && !showStartGameModal && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 42,
            display: "flex",
            gap: 8,
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
      )}
      {!showFinishModal && !showStartGameModal && (
        <div
          className="hud-bottom-dock"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            zIndex: 41,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              ...hudBottomPanel,
              pointerEvents: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: 4,
            }}
          >
            {chargeHud === null && !shotInFlight && !showFinishModal && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={showPowerupMenu}
                    aria-controls="powerup-precharge-panel"
                    onClick={() => setShowPowerupMenu((v) => !v)}
                    style={goldChipButtonStyle()}
                  >
                    {showPowerupMenu ? "Hide power-ups" : "Power-ups"}
                  </button>
                </div>
                {showPowerupMenu && (
                  <div
                    id="powerup-precharge-panel"
                    style={{
                      ...hudFont,
                      padding: "4px 2px 2px",
                      borderRadius: 12,
                      backgroundColor: "rgba(230, 248, 255, 0.45)",
                      border: "1px solid rgba(255,255,255,0.75)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
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
                      onPowerup={activatePowerup}
                    />
                  </div>
                )}
              </div>
            )}
            {chargeHud === null && (
              <AimHud
                aimYawRad={aimYawRad}
                disabled={shotInFlight}
                onMinus90={() =>
                  setAimYawRad((a) =>
                    wrapYawRad(a - AIM_YAW_QUARTER_TURN_RAD)
                  )
                }
                onLeft={() =>
                  setAimYawRad((a) => wrapYawRad(a + AIM_YAW_STEP_RAD))
                }
                onRight={() =>
                  setAimYawRad((a) => wrapYawRad(a - AIM_YAW_STEP_RAD))
                }
                onPlus90={() =>
                  setAimYawRad((a) =>
                    wrapYawRad(a + AIM_YAW_QUARTER_TURN_RAD)
                  )
                }
              />
            )}
            <ShotHud
              shotInFlight={shotInFlight}
              cooldownUntil={cooldownUntil}
              chargeHud={chargeHud}
              strengthCharges={strengthCharges}
              noBounceCharges={noBounceCharges}
              noWindCharges={noWindCharges}
              noBounceActive={noBounceActive}
              noWindActive={noWindActive}
              onPowerup={activatePowerup}
              vehicle={playerVehicle}
            />
          </div>
        </div>
      )}
      {!showFinishModal && !showStartGameModal && (
        <div
          style={{
            position: "absolute",
            right: 14,
            bottom: 18,
            zIndex: 45,
            pointerEvents: "none",
          }}
        >
          <button
            type="button"
            aria-label={chargeHud === null ? "Fire" : `Fire clicks ${chargeHud.clicks}`}
            onClick={onFireButtonPress}
            disabled={fireButtonDisabled}
            style={{
              ...hudFont,
              pointerEvents: "auto",
              width: 84,
              height: 84,
              borderRadius: "50%",
              border: fireButtonDisabled
                ? "2px solid rgba(120,120,120,0.9)"
                : "2px solid rgba(255,255,255,0.92)",
              backgroundImage: fireButtonDisabled
                ? "linear-gradient(180deg, #9ca3af 0%, #6b7280 100%)"
                : "linear-gradient(180deg, #ff6b6b 0%, #dc2626 52%, #991b1b 100%)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: chargeHud === null ? 20 : 28,
              lineHeight: 1,
              textShadow: "0 2px 3px rgba(0,0,0,0.38)",
              boxShadow: fireButtonDisabled
                ? "inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 12px rgba(0,0,0,0.2)"
                : "inset 0 1px 0 rgba(255,255,255,0.45), 0 8px 16px rgba(127, 29, 29, 0.45)",
              cursor: fireButtonDisabled ? "not-allowed" : "pointer",
            }}
          >
            {fireButtonLabel}
          </button>
        </div>
      )}
      <StartGameModal
        open={showStartGameModal}
        onStart={onStartGame}
      />
      <FinishGameModal open={showFinishModal} sessionShots={sessionShots} />
      <HelpModal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        vehicle={playerVehicle}
      />
      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}
