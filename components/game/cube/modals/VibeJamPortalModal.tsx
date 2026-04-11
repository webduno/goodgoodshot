"use client";

import { useEffect, useRef, useState } from "react";
import {
  goldChipButtonStyle,
  helpModalCard,
  hudColors,
  hudFont,
  modalBackdrop,
} from "@/components/gameHudStyles";

const MAX_USERNAME_LEN = 64;

export function VibeJamPortalModal({
  open,
  onClose,
  vehicleName,
  onContinueToPortal,
}: {
  open: boolean;
  onClose: () => void;
  vehicleName: string;
  onContinueToPortal: (username: string) => void;
}) {
  const [username, setUsername] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setUsername("");
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const trimmed = username.trim();
  const canSubmitTyped = trimmed.length > 0;
  const vehicleLabel =
    vehicleName.length > 0 ? vehicleName : "vehicle";

  const submitTyped = () => {
    if (!canSubmitTyped) return;
    onContinueToPortal(trimmed.slice(0, MAX_USERNAME_LEN));
  };

  const submitVehicle = () => {
    const u = vehicleName.slice(0, MAX_USERNAME_LEN);
    onContinueToPortal(u.length > 0 ? u : "player");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vibe-jam-portal-title"
      style={modalBackdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          ...helpModalCard,
          maxWidth: 420,
          width: "min(94vw, 420px)",
          textAlign: "left",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2
          id="vibe-jam-portal-title"
          style={{
            ...hudFont,
            margin: "0 0 10px",
            fontSize: 18,
            fontWeight: 800,
            color: hudColors.label,
            lineHeight: 1.2,
          }}
        >
          Vibe Jam portal
        </h2>
        <p
          style={{
            ...hudFont,
            margin: "0 0 12px",
            fontSize: 12,
            color: "rgba(0, 55, 95, 0.72)",
            lineHeight: 1.35,
          }}
        >
          Choose the username sent to the webring. Your color and speed still
          come from this shot.
        </p>
        <label
          htmlFor="vibe-jam-username"
          style={{
            ...hudFont,
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: hudColors.label,
            marginBottom: 6,
          }}
        >
          Username
        </label>
        <input
          ref={inputRef}
          id="vibe-jam-username"
          type="text"
          autoComplete="username"
          maxLength={MAX_USERNAME_LEN}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmitTyped) {
              e.preventDefault();
              submitTyped();
            }
          }}
          placeholder="Enter a name…"
          style={{
            ...hudFont,
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 12px",
            fontSize: 14,
            borderRadius: 12,
            border: "1px solid rgba(0, 55, 95, 0.2)",
            background: "rgba(255,255,255,0.92)",
            color: hudColors.value,
            marginBottom: 14,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <button
            type="button"
            disabled={!canSubmitTyped}
            onClick={submitTyped}
            style={{
              ...goldChipButtonStyle(),
              width: "100%",
              padding: "10px 14px",
              fontSize: 13,
              opacity: canSubmitTyped ? 1 : 0.55,
              cursor: canSubmitTyped ? "pointer" : "not-allowed",
            }}
          >
            Continue
          </button>
          <button
            type="button"
            onClick={submitVehicle}
            style={{
              ...goldChipButtonStyle(),
              width: "100%",
              padding: "10px 14px",
              fontSize: 13,
            }}
          >
            Continue as {vehicleLabel}
          </button>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...goldChipButtonStyle(),
                padding: "6px 14px",
                fontSize: 11,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
