"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const CubeScene = dynamic(() => import("@/components/CubeScene"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center"
      style={{
        width: "100vw",
        height: "100vh",
        background:
          "linear-gradient(180deg, #d4f1ff 0%, #7dd3fc 38%, #00aeef 72%, #0072bc 100%)",
        color: "#0a5f8a",
        textShadow: "0 1px 0 rgba(255,255,255,0.5)",
      }}
    >
      Loading scene…
    </div>
  ),
});

function webglContextAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ??
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ??
      canvas.getContext("experimental-webgl", {
        failIfMajorPerformanceCaveat: false,
      })
    );
  } catch {
    return false;
  }
}

export function HomeCanvas() {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglOk(webglContextAvailable());
  }, []);

  if (webglOk === null) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          width: "100vw",
          height: "100vh",
          background:
            "linear-gradient(180deg, #d4f1ff 0%, #7dd3fc 38%, #00aeef 72%, #0072bc 100%)",
          color: "#0a5f8a",
          textShadow: "0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        Loading scene…
      </div>
    );
  }

  if (!webglOk) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 px-6 text-center"
        style={{
          width: "100vw",
          height: "100vh",
          background:
            "linear-gradient(180deg, #d4f1ff 0%, #7dd3fc 38%, #00aeef 72%, #0072bc 100%)",
          color: "#0a5f8a",
          textShadow: "0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>
          WebGL is not available in this environment.
        </p>
        <p style={{ maxWidth: "28rem", lineHeight: 1.5 }}>
          Open the app in Chrome or Edge with hardware acceleration enabled, or
          use a normal browser tab instead of an embedded or sandboxed preview.
        </p>
      </div>
    );
  }

  return <CubeScene />;
}
