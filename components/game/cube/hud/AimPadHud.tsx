"use client";

import {
  goldIconButtonStyle,
  hudAimPanelStrip,
  hudFont,
} from "@/components/gameHudStyles";
import { snapAimAngleRad, wrapYawRad } from "@/lib/game/math";
import {
  useCallback,
  useRef,
  type CSSProperties,
  type PointerEvent,
} from "react";

/** Outer widget; yaw is read from pointer angle around center (world yaw, not vehicle side). */
const PAD_SIZE_PX = 152;
const DOT_SIZE_PX = 14;
const TRACK_INSET_PX = 4;
const TRACK_RADIUS_PX = PAD_SIZE_PX / 2 - DOT_SIZE_PX / 2 - TRACK_INSET_PX;
/** Ignore tiny jitter at the hub (no yaw change). */
const YAW_DEAD_ZONE_PX = 10;
/** Inner reference ring (top-down compass, +Z = 12 o’clock). */
const SUB_CIRCLE_RADIUS_PX = 34;
const PAD_CENTER_PX = PAD_SIZE_PX / 2;

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

/**
 * World-horizontal aim: circular “range” (angle from center). Pitch: W/S or arrow up/down.
 * Matches shot basis: vx = sin(yaw), vz = cos(yaw) → atan2(dx, −dy) on screen (y down).
 * Thumb/needle use the same basis so the dot sits where you drag.
 */
export function AimPadHud({
  disabled,
  aimYawRad,
  aimPitchOffsetRad,
  onAimChange,
  onSideRotate,
}: {
  disabled: boolean;
  aimYawRad: number;
  aimPitchOffsetRad: number;
  onAimChange: (next: { yawRad: number; pitchOffsetRad: number }) => void;
  /** +1 = 90° right (⇒); −1 = 90° left (⇐). HUD yaw. */
  onSideRotate: (dir: 1 | -1) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const applyYawFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      if (Math.hypot(dx, dy) < YAW_DEAD_ZONE_PX) return;
      const yawRad = wrapYawRad(snapAimAngleRad(Math.atan2(dx, -dy)));
      onAimChange({ yawRad, pitchOffsetRad: aimPitchOffsetRad });
    },
    [aimPitchOffsetRad, onAimChange]
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      applyYawFromPointer(e.clientX, e.clientY);
    },
    [applyYawFromPointer, disabled]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      applyYawFromPointer(e.clientX, e.clientY);
    },
    [applyYawFromPointer, disabled]
  );

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const thumbX = TRACK_RADIUS_PX * Math.sin(aimYawRad);
  const thumbY = -TRACK_RADIUS_PX * Math.cos(aimYawRad);

  const innerNeedleX = SUB_CIRCLE_RADIUS_PX * Math.sin(aimYawRad);
  const innerNeedleY = -SUB_CIRCLE_RADIUS_PX * Math.cos(aimYawRad);

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
        minWidth: PAD_SIZE_PX,
        height: PAD_SIZE_PX,
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
            onSideRotate(-1);
          }}
          style={{
            ...padSideButtonStyle(disabled),
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translate(calc(-50% - 6px), -50%)",
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
            onSideRotate(1);
          }}
          style={{
            ...padSideButtonStyle(disabled),
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translate(calc(50% + 6px), -50%)",
          }}
        >
          ⇒
        </button>
        <div
          ref={containerRef}
          role="application"
          aria-label="Aim: drag around the ring for full 360 degree world yaw. Use W and S or arrow keys for pitch."
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
          <svg
            width={PAD_SIZE_PX}
            height={PAD_SIZE_PX}
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <g transform={`translate(${PAD_CENTER_PX}, ${PAD_CENTER_PX})`}>
              <circle
                r={SUB_CIRCLE_RADIUS_PX}
                fill="none"
                stroke="rgba(0, 90, 140, 0.28)"
                strokeWidth={1}
              />
              <circle
                r={2.25}
                cx={0}
                cy={-SUB_CIRCLE_RADIUS_PX}
                fill="rgba(0, 90, 140, 0.4)"
              />
              <line
                x1={0}
                y1={0}
                x2={innerNeedleX}
                y2={innerNeedleY}
                stroke="rgba(0, 130, 195, 0.45)"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <circle
                r={TRACK_RADIUS_PX}
                fill="none"
                stroke="rgba(0, 90, 140, 0.5)"
                strokeWidth={2.5}
              />
              <circle
                r={DOT_SIZE_PX / 2 + 1}
                cx={thumbX}
                cy={thumbY}
                fill="rgba(255, 90, 90, 0.98)"
                stroke="rgba(0,0,0,0.2)"
                strokeWidth={1}
              />
            </g>
          </svg>
        </div>
    </div>
  );
}
