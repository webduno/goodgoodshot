"use client";

import { RetroTvEffect } from "@/lib/game/retroTvEffect";
import { EffectComposer } from "@react-three/postprocessing";
import { extend, useThree } from "@react-three/fiber";
import type { Camera } from "three";
import type { FC } from "react";

extend({ RetroTvEffect });

const RetroTvEffectR3f = "retroTvEffect" as unknown as FC<{
  camera: Camera;
  args?: [Record<string, never>?];
}>;

export function RetroTvPostFx({ enabled }: { enabled: boolean }) {
  const camera = useThree((s) => s.camera);
  if (!enabled) return null;

  return (
    <EffectComposer enabled>
      <RetroTvEffectR3f camera={camera} args={[{}]} />
    </EffectComposer>
  );
}
