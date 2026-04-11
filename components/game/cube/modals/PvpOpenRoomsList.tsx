"use client";

import { useCallback, useEffect, useState } from "react";
import {
  goldChipButtonStyle,
  hudColors,
  hudFont,
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

export function PvpOpenRoomsList({
  enabled,
  busy,
  onJoinRoom,
  compactTitle = false,
  columnMode = false,
  headingId,
}: {
  enabled: boolean;
  busy: boolean;
  onJoinRoom: (roomId: string) => void | Promise<void>;
  /** Smaller heading for embedded panels (e.g. start modal). */
  compactTitle?: boolean;
  /** Narrow side column in start modal — shorter copy and scroll area. */
  columnMode?: boolean;
  /** Optional id for `aria-labelledby` on a parent dialog. */
  headingId?: string;
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
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom:
            columnMode ? 6 : compactTitle ? 8 : 12,
        }}
      >
        <h2
          id={headingId}
          style={{
            ...hudFont,
            margin: 0,
            fontSize: columnMode ? 11 : compactTitle ? 14 : 18,
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
      {columnMode ? (
        <p
          style={{
            ...hudFont,
            margin: "0 0 6px",
            fontSize: 9,
            color: "rgba(0, 55, 95, 0.65)",
            lineHeight: 1.3,
          }}
        >
          Today&apos;s open lobbies (UTC).
        </p>
      ) : (
        <p
          style={{
            ...hudFont,
            margin: compactTitle ? "0 0 8px" : "0 0 12px",
            fontSize: compactTitle ? 11 : 12,
            color: "rgba(0, 55, 95, 0.72)",
            lineHeight: 1.35,
          }}
        >
          Open lobbies from today (UTC) you can join. Your own room is not listed
          here.
        </p>
      )}
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
          maxHeight: columnMode
            ? "min(120px, 28vh)"
            : compactTitle
              ? "min(36vh, 200px)"
              : "min(42vh, 280px)",
          overflow: "auto",
          borderRadius: 14,
          border: "1px solid rgba(0, 55, 95, 0.14)",
          background: "rgba(255,255,255,0.55)",
          padding: columnMode ? 6 : 8,
          marginBottom: compactTitle ? 0 : 12,
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
    </div>
  );
}
