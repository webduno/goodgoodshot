"use client";

import dynamic from "next/dynamic";

const CubeScene = dynamic(() => import("@/components/CubeScene"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center text-zinc-400"
      style={{ width: "100vw", height: "100vh", background: "#0a0a0a" }}
    >
      Loading scene…
    </div>
  ),
});

export function HomeCanvas() {
  return <CubeScene />;
}
