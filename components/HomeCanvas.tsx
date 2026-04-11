"use client";

import { PlayerStatsProvider } from "@/components/PlayerStatsProvider";
import dynamic from "next/dynamic";

const CubeScene = dynamic(() => import("@/components/CubeScene"), {
  ssr: false,
  loading: () => (
    <div
      className="flex flex-col items-center justify-center gap-4"
      style={{
        width: "100vw",
        height: "100vh",
        background:
          "linear-gradient(180deg, #d4f1ff 0%, #7dd3fc 38%, #00aeef 72%, #0072bc 100%)",
        color: "#0a5f8a",
        textShadow: "0 1px 0 rgba(255,255,255,0.5)",
      }}
    >
      <div className="scene-loading-spinner" aria-hidden />
      <span>Loading scene…</span>
    </div>
  ),
});

export function HomeCanvas() {
  return (
    <PlayerStatsProvider>
      <CubeScene />
    </PlayerStatsProvider>
  );
}
