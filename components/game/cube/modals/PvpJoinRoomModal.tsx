"use client";

import { useEffect } from "react";
import {
  goldChipButtonStyle,
  helpModalCard,
  modalBackdrop,
} from "@/components/gameHudStyles";
import { PvpOpenRoomsList } from "@/components/game/cube/modals/PvpOpenRoomsList";

export function PvpJoinRoomModal({
  open,
  onClose,
  busy,
  onJoinRoom,
}: {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  onJoinRoom: (roomId: string) => void | Promise<void>;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pvp-join-room-title"
      style={modalBackdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          ...helpModalCard,
          maxWidth: 400,
          width: "min(94vw, 400px)",
          textAlign: "left",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <PvpOpenRoomsList
          enabled={open}
          busy={busy}
          onJoinRoom={onJoinRoom}
          headingId="pvp-join-room-title"
        />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={goldChipButtonStyle()}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
