"use client";

import {
  goldIconButtonStyle,
  hudAimPanelStrip,
  hudFont,
} from "@/components/gameHudStyles";
import { AIM_PAD_LOCAL_YAW_HALF_RAD, AIM_PITCH_MAX_RAD } from "@/lib/game/constants";
import {
  clampAimPitchOffsetRad,
  clampYawDeltaToPadArc,
  snapAimAngleRad,
  wrapYawRad,
} from "@/lib/game/math";
import {
  useCallback,
  useRef,
  type CSSProperties,
  type PointerEvent,
} from "react";

/** Outer box; dot stays inside the circular track. */
const PAD_SIZE_PX = 152;
const DOT_SIZE_PX = 12;
const TRACK_INSET_PX = 4;
const TRACK_RADIUS_PX = PAD_SIZE_PX / 2 - DOT_SIZE_PX / 2 - TRACK_INSET_PX;

const SIDE_BTN_PX = 30;

function padSideButtonStyle(disabled: boolean): CSSProperties {
  return {
    ...goldIconButtonStyle(disabled),
    width: SIDE_BTN_PX,
    height: SIDE_BTN_PX,
    minWidth: SIDE_BTN_PX,
    padding: 0,
    fontSize: 14,
    fontWeight: 900,
    zIndex: 2,
  };
}

export function AimPadHud({
  disabled,
  aimSideYawRad,
  aimYawRad,
  aimPitchOffsetRad,
  onAimChange,
  onSideRotate,
}: {
  disabled: boolean;
  aimSideYawRad: number;
  aimYawRad: number;
  aimPitchOffsetRad: number;
  onAimChange: (next: { yawRad: number; pitchOffsetRad: number }) => void;
  /** +1 = same as ⇐ (plus 90° yaw); −1 = same as ⇒ (minus 90°). */
  onSideRotate: (dir: 1 | -1) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const pointerToNormalized = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { nx: 0, ny: 0 };
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let nx = (clientX - cx) / TRACK_RADIUS_PX;
      let ny = -(clientY - cy) / TRACK_RADIUS_PX;
      const len = Math.hypot(nx, ny);
      if (len > 1) {
        nx /= len;
        ny /= len;
      }
      return { nx, ny };
    },
    []
  );

  const applyFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const { nx, ny } = pointerToNormalized(clientX, clientY);
      const rawLocalYaw = -nx * AIM_PAD_LOCAL_YAW_HALF_RAD;
      const localYaw = clampYawDeltaToPadArc(snapAimAngleRad(rawLocalYaw));
      const yawRad = wrapYawRad(aimSideYawRad + localYaw);
      const rawPitch = ny * AIM_PITCH_MAX_RAD;
      const pitchOffsetRad = clampAimPitchOffsetRad(snapAimAngleRad(rawPitch));
      onAimChange({ yawRad, pitchOffsetRad });
    },
    [aimSideYawRad, onAimChange, pointerToNormalized]
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      applyFromPointer(e.clientX, e.clientY);
    },
    [applyFromPointer, disabled]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      applyFromPointer(e.clientX, e.clientY);
    },
    [applyFromPointer, disabled]
  );

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const localYawDisplay = clampYawDeltaToPadArc(
    wrapYawRad(aimYawRad - aimSideYawRad)
  );
  const nx = -localYawDisplay / AIM_PAD_LOCAL_YAW_HALF_RAD;
  const ny = aimPitchOffsetRad / AIM_PITCH_MAX_RAD;
  const dotOffsetX = nx * TRACK_RADIUS_PX;
  const dotOffsetY = -ny * TRACK_RADIUS_PX;

  const padStyle: CSSProperties = {
    ...hudFont,
    ...hudAimPanelStrip,
    position: "relative",
    width: PAD_SIZE_PX,
    height: PAD_SIZE_PX,
    minWidth: PAD_SIZE_PX,
    minHeight: PAD_SIZE_PX,
    borderRadius: "50%",
    padding: 0,
    touchAction: "none",
    cursor: disabled ? "not-allowed" : "grab",
    opacity: disabled ? 0.55 : 1,
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "relative",
        width: PAD_SIZE_PX,
        height: PAD_SIZE_PX,
        minWidth: PAD_SIZE_PX,
        minHeight: PAD_SIZE_PX,
      }}
    >
      <button
        type="button"
        aria-label="Turn aim 90 degrees left (same as ⇐)"
        title="Turn 90° left"
        disabled={disabled}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onSideRotate(1);
        }}
        style={{
          ...padSideButtonStyle(disabled),
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        ⇐
      </button>
      <button
        type="button"
        aria-label="Turn aim 90 degrees right (same as ⇒)"
        title="Turn 90° right"
        disabled={disabled}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onSideRotate(-1);
        }}
        style={{
          ...padSideButtonStyle(disabled),
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translate(50%, -50%)",
        }}
      >
        ⇒
      </button>
      <div
        ref={containerRef}
        role="application"
        aria-label="Aim pad: drag the dot within ±45° on this side; edge buttons rotate 90°. Up aims up. Values snap to 5 degrees."
        style={padStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: TRACK_INSET_PX,
            borderRadius: "50%",
            border: "1px solid rgba(0, 90, 140, 0.22)",
            boxShadow: "inset 0 1px 2px rgba(0, 55, 95, 0.12)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: DOT_SIZE_PX,
            height: DOT_SIZE_PX,
            marginLeft: -DOT_SIZE_PX / 2,
            marginTop: -DOT_SIZE_PX / 2,
            transform: `translate(${dotOffsetX}px, ${dotOffsetY}px)`,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 35% 30%, #ff6b6b 0%, #c92a2a 55%, #7f1d1d 100%)",
            border: "1px solid rgba(0,0,0,0.25)",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
