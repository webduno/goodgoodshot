"use client";

import { ToastNotif } from "@/components/ToastNotif";
import { FinishGameModal } from "@/components/game/cube/modals/FinishGameModal";
import { HelpModal } from "@/components/game/cube/modals/HelpModal";
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
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPowerupMenu, setShowPowerupMenu] = useState(false);
  const [waterToastToken, setWaterToastToken] = useState(0);
  const [chargeHud, setChargeHud] = useState<{
    remainingMs: number;
    clicks: number;
  } | null>(null);
  const [, setHudTick] = useState(0);

  const powerupStackRef = useRef(0);
  const noBounceRef = useRef(false);
  /** Kept in sync with state each render for reliable guards in handlers. */
  const strengthChargesRef = useRef(INITIAL_POWERUP_CHARGES);
  const noBounceChargesRef = useRef(INITIAL_POWERUP_CHARGES);
  const [powerupStackCount, setPowerupStackCount] = useState(0);
  const [noBounceActive, setNoBounceActive] = useState(false);
  const [strengthCharges, setStrengthCharges] = useState(INITIAL_POWERUP_CHARGES);
  const [noBounceCharges, setNoBounceCharges] = useState(INITIAL_POWERUP_CHARGES);
  strengthChargesRef.current = strengthCharges;
  noBounceChargesRef.current = noBounceCharges;

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
  }, []);

  const activatePowerup = useCallback(
    (slotId: PowerupSlotId) => {
      if (shotInFlight || showFinishModal) return;

      if (slotId === "strength") {
        if (strengthChargesRef.current <= 0) return;
        powerupStackRef.current += 1;
        setPowerupStackCount(powerupStackRef.current);
        setStrengthCharges((c) => (c <= 0 ? c : c - 1));
        return;
      }

      if (slotId === "noBounce") {
        if (noBounceRef.current) return;
        if (noBounceChargesRef.current <= 0) return;
        noBounceRef.current = true;
        setNoBounceActive(true);
        setNoBounceCharges((c) => (c <= 0 ? c : c - 1));
      }
    },
    [shotInFlight, showFinishModal]
  );

  const onChargeHudUpdate = useCallback(
    (next: { remainingMs: number; clicks: number } | null) => {
      setChargeHud(next);
    },
    []
  );

  const onShootStart = useCallback(() => {
    setShotInFlight(true);
    spawnBeforeShotRef.current = gameSpawnRef.current;
    setSessionShots((n) => n + 1);
  }, []);

  const onProjectileEnd = useCallback(
    (outcome: "hit" | "miss" | "penalty", landing?: Vec3) => {
      setShotInFlight(false);
      if (outcome === "penalty") {
        setWaterToastToken((t) => t + 1);
        dispatch({
          type: "PROJECTILE_END",
          outcome: "penalty",
          revertSpawn: [...spawnBeforeShotRef.current] as Vec3,
        });
      } else {
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
    [playerVehicle]
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
    if (showFinishModal) setShowHelpModal(false);
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
        <InitialFieldGround />
        <TeleportOrbitRig gameSpawn={game.spawnCenter}>
          <SceneContent
            spawnCenter={game.spawnCenter}
            goalCenter={goalCenter}
            ponds={game.ponds}
            aimYawRad={aimYawRad}
            cooldownUntil={cooldownUntil}
            roundLocked={showFinishModal}
            vehicle={playerVehicle}
            onChargeHudUpdate={onChargeHudUpdate}
            onShootStart={onShootStart}
            onProjectileEnd={onProjectileEnd}
            getPowerupMultiplier={getPowerupMultiplier}
            getNoBounceActive={getNoBounceActive}
            resetPowerupStack={resetPowerupStack}
          />
        </TeleportOrbitRig>
      </Canvas>
      <ToastNotif showToken={waterToastToken} message="Water hazard" />
      <StatsHud
        spawnCenter={game.spawnCenter}
        sessionShots={sessionShots}
        chargeHud={chargeHud}
        shotInFlight={shotInFlight}
        cooldownUntil={cooldownUntil}
        strengthCharges={strengthCharges}
        noBounceCharges={noBounceCharges}
        powerupStackCount={powerupStackCount}
        noBounceActive={noBounceActive}
        vehicle={playerVehicle}
      />
      {!showFinishModal && (
        <button
          type="button"
          aria-label="Open help"
          onClick={() => setShowHelpModal(true)}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 42,
            ...goldChipButtonStyle(),
          }}
        >
          Help
        </button>
      )}
      {!showFinishModal && (
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
                      canUseStrength={strengthCharges > 0}
                      canUseNoBounce={
                        noBounceCharges > 0 && !noBounceActive
                      }
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
              noBounceActive={noBounceActive}
              onPowerup={activatePowerup}
              vehicle={playerVehicle}
            />
          </div>
        </div>
      )}
      <FinishGameModal open={showFinishModal} sessionShots={sessionShots} />
      <HelpModal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        vehicle={playerVehicle}
      />
    </div>
  );
}
