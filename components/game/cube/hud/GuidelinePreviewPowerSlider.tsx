"use client";

import { useCallback, useRef, type PointerEvent } from "react";

import {
  maxClicksForStrengthBarRef,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";
import {
  FIRE_POWER_VERTICAL_TRACK_HEIGHT_PX,
  FIRE_POWER_VERTICAL_TRACK_WIDTH_PX,
  hudColors,
  hudFont,
  progressFillStyleVertical,
  progressTrackVerticalStrength,
} from "@/components/gameHudStyles";

/** Fill 0→1 for clicks within the reference strength bar (same idea as `ShotHud`). */
function previewStrengthBarRatio(clicks: number, v: PlayerVehicleConfig): number {
  const maxClicksRef = maxClicksForStrengthBarRef(v);
  const n = Math.min(maxClicksRef, Math.max(1, Math.round(clicks)));
  return (n - 1) / Math.max(1, maxClicksRef - 1);
}

/**
 * Vertical slider: sets guideline preview and Shoot strength (same click count as the strength bar).
 * Top = max reference bar, bottom = minimum (1 click).
 */
export function GuidelinePreviewPowerSlider({
  vehicle,
  clicks,
  onClicksChange,
}: {
  vehicle: PlayerVehicleConfig;
  clicks: number;
  onClicksChange: (next: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const maxC = maxClicksForStrengthBarRef(vehicle);
  const value = Math.min(maxC, Math.max(1, Math.round(clicks)));
  const fillPct = previewStrengthBarRatio(value, vehicle);

  const setFromClientY = useCallback(
    (clientY: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const t = 1 - (clientY - rect.top) / rect.height;
      const clamped = Math.min(1, Math.max(0, t));
      const next =
        maxC <= 1 ? 1 : Math.round(1 + clamped * (maxC - 1));
      onClicksChange(next);
    },
    [maxC, onClicksChange]
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = true;
      if (e.currentTarget instanceof HTMLElement) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      setFromClientY(e.clientY);
    },
    [setFromClientY]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      setFromClientY(e.clientY);
    },
    [setFromClientY]
  );

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (e.currentTarget instanceof HTMLElement) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        pointerEvents: "auto",
        userSelect: "none",
        touchAction: "none",
        ...hudFont,
      }}
    >
      <div
        style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: hudColors.label,
          textTransform: "uppercase",
          textAlign: "center",
          lineHeight: 1.15,
          maxWidth: 56,
          backgroundColor: "#fff",
          padding: "3px 6px",
          borderRadius: 3,
        }}
      >
        Guide
        <br />
        power
      </div>
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={1}
        aria-valuemax={maxC}
        aria-valuenow={value}
        aria-label="Guideline preview power"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            onClicksChange(Math.min(maxC, value + 1));
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            onClicksChange(Math.max(1, value - 1));
          } else if (e.key === "Home") {
            e.preventDefault();
            onClicksChange(maxC);
          } else if (e.key === "End") {
            e.preventDefault();
            onClicksChange(1);
          }
        }}
        style={{
          ...progressTrackVerticalStrength,
          height: FIRE_POWER_VERTICAL_TRACK_HEIGHT_PX,
          width: FIRE_POWER_VERTICAL_TRACK_WIDTH_PX,
          maxHeight: FIRE_POWER_VERTICAL_TRACK_HEIGHT_PX,
          cursor: "pointer",
          position: "relative",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          style={{
            ...progressFillStyleVertical(fillPct, "strength"),
            background:
              "linear-gradient(180deg, #5eead4, #0d9488)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -2,
            right: -2,
            height: 5,
            bottom: `${fillPct * 100}%`,
            transform: "translateY(50%)",
            borderRadius: 3,
            background: "#ffffff",
            boxShadow:
              "0 0 0 1.5px #0d9488, 0 1px 4px rgba(0,60,60,0.35)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
