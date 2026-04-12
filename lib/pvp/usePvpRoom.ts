"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PvpShotBroadcastPayload } from "@/lib/pvp/shotBroadcast";
import type { PvpRoomRow } from "@/lib/pvp/types";
import { useCallback, useEffect, useRef, useState } from "react";

export function usePvpRoom(
  roomId: string | null,
  onRemoteShot?: (payload: PvpShotBroadcastPayload) => void
) {
  const [room, setRoom] = useState<PvpRoomRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createSupabaseBrowserClient>["channel"]
  > | null>(null);
  const onRemoteShotRef = useRef(onRemoteShot);
  onRemoteShotRef.current = onRemoteShot;

  const broadcastShot = useCallback((payload: PvpShotBroadcastPayload) => {
    const ch = channelRef.current;
    if (!ch) return;
    void ch.send({
      type: "broadcast",
      event: "pvp_shot",
      payload,
    });
  }, []);

  const refreshRoom = useCallback(async () => {
    if (!roomId) return;
    const supabase = createSupabaseBrowserClient();
    const { data, error: qErr } = await supabase
      .from("pvp_rooms")
      .select("*")
      .eq("id", roomId)
      .maybeSingle();
    if (qErr) {
      setError(qErr.message);
      return;
    }
    if (data) {
      setError(null);
      setRoom(data as PvpRoomRow);
    } else {
      setError("Room not found");
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    void (async () => {
      try {
        setError(null);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          const { error: anonErr } = await supabase.auth.signInAnonymously();
          if (anonErr) {
            if (!cancelled) setError(anonErr.message);
            return;
          }
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        setUserId(user?.id ?? null);
        setAuthReady(true);

        const { error: joinErr } = await supabase.rpc("join_pvp_room_by_id", {
          p_room_id: roomId,
        });
        if (joinErr && joinErr.message.includes("room full")) {
          setError(joinErr.message);
        }

        await refreshRoom();
      } finally {
        if (!cancelled) setInitialFetchDone(true);
      }

      const channel = supabase
        .channel(`pvp-room-${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pvp_rooms",
            filter: `id=eq.${roomId}`,
          },
          () => {
            void refreshRoom();
          }
        )
        .on("broadcast", { event: "pvp_shot" }, (evt: { payload?: unknown }) => {
          const p = evt.payload as PvpShotBroadcastPayload | undefined;
          if (p?.senderId) onRemoteShotRef.current?.(p);
        })
        .subscribe();
      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      const ch = channelRef.current;
      channelRef.current = null;
      if (ch) supabase.removeChannel(ch);
    };
  }, [roomId, refreshRoom]);

  return {
    room,
    userId,
    authReady,
    initialFetchDone,
    error,
    refreshRoom,
    setRoom,
    broadcastShot,
  };
}
