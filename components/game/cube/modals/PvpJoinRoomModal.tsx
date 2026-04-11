"use client";

import { useCallback, useEffect, useState } from "react";
import {
  goldChipButtonStyle,
  helpModalCard,
  hudColors,
  hudFont,
  modalBackdrop,
} from "@/components/gameHudStyles";
import {
  listOpenPvpRoomsToday,
  type OpenPvpRoomRow,
} from "@/lib/pvp/plazaActions";

function formatRoomTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

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
  const [rooms, setRooms] = useState<OpenPvpRoomRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listOpenPvpRoomsToday();
      setRooms(rows);
    } catch (e) {
      const msg =
        e instanceof Error && e.message ? e.message : "Could not load rooms";
      setLoadError(msg);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

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
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <h2
            id="pvp-join-room-title"
            style={{
              ...hudFont,
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: hudColors.label,
              lineHeight: 1.2,
            }}
          >
            Today&apos;s rooms
          </h2>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || busy}
            style={{
              ...goldChipButtonStyle(),
              padding: "6px 10px",
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            Refresh
          </button>
        </div>
        <p
          style={{
            ...hudFont,
            margin: "0 0 12px",
            fontSize: 12,
            color: "rgba(0, 55, 95, 0.72)",
            lineHeight: 1.35,
          }}
        >
          Open lobbies from today (UTC) you can join. Your own room is not listed
          here.
        </p>
        {loadError && (
          <p
            style={{
              ...hudFont,
              margin: "0 0 10px",
              fontSize: 12,
              color: "#b42318",
            }}
          >
            {loadError}
          </p>
        )}
        <div
          style={{
            maxHeight: "min(42vh, 280px)",
            overflow: "auto",
            borderRadius: 14,
            border: "1px solid rgba(0, 55, 95, 0.14)",
            background: "rgba(255,255,255,0.55)",
            padding: 8,
            marginBottom: 12,
          }}
        >
          {loading && rooms.length === 0 && !loadError ? (
            <p
              style={{
                ...hudFont,
                margin: 0,
                fontSize: 13,
                color: "rgba(0, 55, 95, 0.65)",
                textAlign: "center",
                padding: "16px 8px",
              }}
            >
              Loading…
            </p>
          ) : rooms.length === 0 ? (
            <p
              style={{
                ...hudFont,
                margin: 0,
                fontSize: 13,
                color: "rgba(0, 55, 95, 0.65)",
                textAlign: "center",
                padding: "16px 8px",
              }}
            >
              No joinable rooms right now.
            </p>
          ) : (
            <ul
              style={{
                ...hudFont,
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {rooms.map((r) => (
                <li
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 12,
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(232, 246, 255, 0.85) 100%)",
                    border: "1px solid rgba(0, 55, 95, 0.12)",
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: hudColors.label,
                        wordBreak: "break-all",
                      }}
                    >
                      {r.id.slice(0, 8)}…
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "rgba(0, 55, 95, 0.62)",
                      }}
                    >
                      {(r.match_mode ?? "pvp") === "pve" ? "PvE" : "PvP"} ·{" "}
                      {formatRoomTime(r.created_at)} · seed{" "}
                      {String(r.course_seed).slice(0, 8)}…
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={busy || loading}
                    onClick={() => void onJoinRoom(r.id)}
                    style={{
                      ...goldChipButtonStyle(),
                      padding: "6px 12px",
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    Join
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
