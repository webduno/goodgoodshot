"use client";

import { Html } from "@react-three/drei";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Mesh } from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureSupabaseSession } from "@/lib/supabase/ensureSession";
import type { PvpLeaderboardTopRow } from "@/lib/pvp/types";

/** Pedestal on the hub turf — clear of default spawn (0,0) and cardinal portals (±32). */
const PLAZA_LEADERBOARD_X = 10;
const PLAZA_LEADERBOARD_Z = -14;

const HTML_Z_INDEX_RANGE: [number, number] = [35, 0];

function shortId(userId: string): string {
  const s = userId.replace(/-/g, "");
  return s.length >= 8 ? `${s.slice(0, 8)}…` : userId;
}

/**
 * Marble-style cube with an HTML panel listing top PvP Elo (from `pvp_player_ratings`).
 */
export function PlazaPvpLeaderboard() {
  const cubeMeshRef = useRef<Mesh>(null);
  const [rows, setRows] = useState<PvpLeaderboardTopRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Let `Html` occlusion rays pass through this mesh — otherwise the cube face always “wins” vs the panel anchor. */
  useLayoutEffect(() => {
    const m = cubeMeshRef.current;
    if (!m) return;
    m.raycast = () => {};
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureSupabaseSession();
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not start session."
          );
          setRows([]);
        }
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "pvp_leaderboard_top",
        { p_limit: 8 }
      );
      if (!cancelled && !rpcErr && rpcData != null) {
        setRows(rpcData as PvpLeaderboardTopRow[]);
        setError(null);
        return;
      }
      const { data, error: qErr } = await supabase
        .from("pvp_player_ratings")
        .select("user_id, elo, matches_played, wins, losses, updated_at")
        .order("elo", { ascending: false })
        .limit(8);
      if (cancelled) return;
      if (qErr) {
        setError(qErr.message);
        setRows([]);
        return;
      }
      const base = (data ?? []) as PvpLeaderboardTopRow[];
      setRows(base.map((r) => ({ ...r, username: null })));
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cubeH = 1.4;
  const cubeHalf = cubeH / 2;
  const cubeHalfY = cubeHalf;
  const y = TURF_TOP_Y + cubeHalfY;
  /** Flush HTML on the +Z face (single visible side of the cube). */
  const faceZ = cubeHalf + 0.004;

  const panel = (() => {
    if (rows === null) {
      return <span style={{ opacity: 0.85 }}>Loading…</span>;
    }
    if (error) {
      return (
        <span style={{ color: "#b91c1c", fontSize: 11 }}>{error}</span>
      );
    }
    if (rows.length === 0) {
      return (
        <span style={{ opacity: 0.88 }}>No PvP ratings yet.</span>
      );
    }
    return (
      <ol
        style={{
          margin: 0,
          padding: "0 0 0 1.1em",
          fontSize: 11,
          lineHeight: 1.35,
          textAlign: "left",
        }}
      >
        {rows.map((r, i) => (
          <li key={r.user_id} style={{ marginBottom: 2 }}>
            <span style={{ fontWeight: 800, marginRight: 4 }}>{i + 1}.</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.elo}</span>
            <span style={{ opacity: 0.72, marginLeft: 6 }}>
              {r.username != null && r.username !== ""
                ? r.username
                : shortId(r.user_id)}
            </span>
          </li>
        ))}
      </ol>
    );
  })();

  return (
    <group position={[PLAZA_LEADERBOARD_X, y, PLAZA_LEADERBOARD_Z]}>
      <mesh ref={cubeMeshRef} castShadow receiveShadow>
        <boxGeometry args={[1.4, cubeH, 1.4]} />
        <meshStandardMaterial
          color="#818cf8"
          roughness={0.38}
          metalness={0.18}
        />
      </mesh>
      {/* transform Html: scale ~ 400/distanceFactor — avoid large values (e.g. 300) or the panel fills the screen */}
      <Html
        transform
        occlude
        position={[0, 0, faceZ]}
        rotation={[0, 0, 0]}
        distanceFactor={9}
        zIndexRange={HTML_Z_INDEX_RANGE}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            minWidth: 168,
            maxWidth: 220,
            padding: "8px 10px 10px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.94)",
            border: "1px solid rgba(15,23,42,0.12)",
            boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
            color: "#0f172a",
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 6,
              color: "#4338ca",
            }}
          >
            PvP Elo
          </div>
          {panel}
        </div>
      </Html>
    </group>
  );
}
