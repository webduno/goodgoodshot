"use client";

import {
  VehicleBuilderScene,
  type GizmoMode,
} from "@/components/tool/VehicleBuilderScene";
import {
  DEFAULT_PLAYER_VEHICLE,
  vehicleIdForQueryString,
  type PlayerVehicleConfig,
  type VehicleBodyPart,
} from "@/components/playerVehicleConfig";
import { usePlayerStats } from "@/components/PlayerStatsProvider";
import { useResolvedPlayerVehicle } from "@/lib/game/useResolvedPlayerVehicle";
import { usePlayerShopInventory } from "@/lib/shop/usePlayerShopInventory";
import { Canvas } from "@react-three/fiber";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PartRow = VehicleBodyPart & { id: string };

function DuplicatePartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function newId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function clonePartsFromVehicle(v: PlayerVehicleConfig): PartRow[] {
  const raw = v.bodyParts;
  if (raw?.length) {
    return raw.map((p, i) => ({
      id: `p-init-${i}`,
      type: p.type,
      pos: [p.pos[0], p.pos[1], p.pos[2]] as [number, number, number],
      size: [p.size[0], p.size[1], p.size[2]] as [number, number, number],
      rotDeg: p.rotDeg
        ? ([p.rotDeg[0], p.rotDeg[1], p.rotDeg[2]] as [number, number, number])
        : undefined,
      color: p.color,
      polygonOffset: p.polygonOffset,
    }));
  }
  return [
    {
      id: newId(),
      type: "cube",
      pos: [0, 0, 0],
      size: [1, 1, 1],
      color: "main",
    },
  ];
}

function triple(
  v: unknown,
  label: string
): [number, number, number] {
  if (!Array.isArray(v) || v.length !== 3) {
    throw new Error(`${label}: expected an array of three numbers`);
  }
  const out: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const n = Number(v[i]);
    if (!Number.isFinite(n)) {
      throw new Error(`${label}[${i}]: invalid number`);
    }
    out[i] = n;
  }
  return out;
}

function parseColor(
  raw: unknown,
  index: number
): VehicleBodyPart["color"] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (raw === "main" || raw === "accent") return raw;
  if (typeof raw === "string") {
    throw new Error(
      `Part ${index}: color string must be "main" or "accent", or use [r,g,b]`
    );
  }
  const t = triple(raw, `Part ${index} color`);
  return [t[0], t[1], t[2]] as [number, number, number];
}

function rawPartToRow(raw: unknown, index: number): PartRow {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Part ${index}: expected an object`);
  }
  const o = raw as Record<string, unknown>;
  const type = o.type;
  if (type !== "cube" && type !== "cylinder" && type !== "sphere") {
    throw new Error(
      `Part ${index}: "type" must be "cube", "cylinder", or "sphere"`
    );
  }
  const pos = triple(o.pos, `Part ${index} pos`);
  const size = triple(o.size, `Part ${index} size`);
  let rotDeg: [number, number, number] | undefined;
  if (o.rotDeg !== undefined) {
    rotDeg = triple(o.rotDeg, `Part ${index} rotDeg`);
  }
  const color = parseColor(o.color, index);
  let polygonOffset: boolean | undefined;
  if (o.polygonOffset === true) polygonOffset = true;
  else if (o.polygonOffset !== undefined && o.polygonOffset !== false) {
    throw new Error(`Part ${index}: polygonOffset must be boolean`);
  }

  return {
    id: newId(),
    type,
    pos,
    size,
    rotDeg,
    color,
    polygonOffset,
  };
}

/**
 * Accepts a JSON array of body parts, or a full vehicle object with `bodyParts`.
 */
function parseBodyPartsImport(text: string): PartRow[] {
  const trimmed = text.trim();
  if (trimmed === "") {
    throw new Error("Paste a JSON array or a vehicle object with bodyParts.");
  }
  let data: unknown;
  try {
    data = JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error("Invalid JSON.");
  }

  let arr: unknown[];
  if (Array.isArray(data)) {
    arr = data;
  } else if (data && typeof data === "object") {
    const bp = (data as { bodyParts?: unknown }).bodyParts;
    if (!Array.isArray(bp)) {
      throw new Error(
        "Expected a JSON array, or an object with a bodyParts array."
      );
    }
    arr = bp;
  } else {
    throw new Error("Expected a JSON array or an object.");
  }

  if (arr.length === 0) {
    throw new Error("bodyParts array is empty.");
  }

  return arr.map((item, i) => rawPartToRow(item, i));
}

function stripForJson(p: PartRow): Record<string, unknown> {
  const { id: _id, ...rest } = p;
  const o: Record<string, unknown> = {
    type: rest.type,
    pos: [...rest.pos],
    size: [...rest.size],
  };
  if (rest.rotDeg != null && rest.rotDeg.some((v) => v !== 0)) {
    o.rotDeg = [...rest.rotDeg];
  }
  if (rest.color !== undefined) {
    o.color =
      rest.color === "main" || rest.color === "accent"
        ? rest.color
        : [...rest.color];
  }
  if (rest.polygonOffset === true) o.polygonOffset = true;
  return o;
}

function partsToBodyPartsJson(rows: PartRow[]): string {
  return JSON.stringify(rows.map(stripForJson), null, 2);
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function buildVehicleEntryJson(
  vId: string,
  name: string,
  mainRgb: [number, number, number],
  accentRgb: [number, number, number],
  rows: PartRow[]
): string {
  const v = DEFAULT_PLAYER_VEHICLE;
  const entry = {
    v_id: vId,
    name,
    mainRgb: [...mainRgb],
    accentRgb: [...accentRgb],
    strengthPerBaseClick: v.strengthPerBaseClick,
    extraClickStrengthFraction: v.extraClickStrengthFraction,
    secondsBeforeShotTrigger: v.secondsBeforeShotTrigger,
    shotCooldownSeconds: v.shotCooldownSeconds,
    gravityY: v.gravityY,
    launchAngleDeg: Math.round(radToDeg(v.launchAngleRad) * 1000) / 1000,
    landingBounces: v.landingBounces,
    bounceRestitution: v.bounceRestitution,
    rollDeceleration: v.rollDeceleration,
    bodyParts: rows.map(stripForJson),
  };
  return JSON.stringify(entry, null, 2);
}

function colorMode(
  color: VehicleBodyPart["color"] | undefined
): "main" | "accent" | "rgb" {
  if (color === "accent") return "accent";
  if (Array.isArray(color)) return "rgb";
  return "main";
}

export default function VehicleBuilderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleParam = searchParams.get("vehicle");
  const { stats } = usePlayerStats();
  const { inventory: shopInventory } = usePlayerShopInventory();
  const { playerVehicle, preferenceHydrated } = useResolvedPlayerVehicle(
    vehicleParam,
    stats,
    shopInventory.ownedVehicleIds
  );
  const appliedResolvedVehicleRef = useRef(false);

  const [mainRgb, setMainRgb] = useState<[number, number, number]>(() => [
    DEFAULT_PLAYER_VEHICLE.mainRgb[0],
    DEFAULT_PLAYER_VEHICLE.mainRgb[1],
    DEFAULT_PLAYER_VEHICLE.mainRgb[2],
  ]);
  const [accentRgb, setAccentRgb] = useState<[number, number, number]>(() => [
    DEFAULT_PLAYER_VEHICLE.accentRgb[0],
    DEFAULT_PLAYER_VEHICLE.accentRgb[1],
    DEFAULT_PLAYER_VEHICLE.accentRgb[2],
  ]);
  const [parts, setParts] = useState<PartRow[]>(() =>
    clonePartsFromVehicle(DEFAULT_PLAYER_VEHICLE)
  );
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    parts[0] ? parts[0].id : null
  );
  const [exportVId, setExportVId] = useState("my-vehicle");
  const [exportName, setExportName] = useState("My vehicle");
  const [exportTab, setExportTab] = useState<"parts" | "full">("parts");
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importHint, setImportHint] = useState<string | null>(null);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>("translate");

  useEffect(() => {
    if (!preferenceHydrated) return;
    if (appliedResolvedVehicleRef.current) return;
    appliedResolvedVehicleRef.current = true;
    const v = playerVehicle;
    setMainRgb([v.mainRgb[0], v.mainRgb[1], v.mainRgb[2]]);
    setAccentRgb([v.accentRgb[0], v.accentRgb[1], v.accentRgb[2]]);
    const nextParts = clonePartsFromVehicle(v);
    setParts(nextParts);
    setSelectedId(nextParts[0]?.id ?? null);
    setExportVId(v.id);
    setExportName(v.name);
  }, [preferenceHydrated, playerVehicle]);

  const selected = parts.find((p) => p.id === selectedId) ?? null;

  const bodyJson = useMemo(() => partsToBodyPartsJson(parts), [parts]);
  const fullJson = useMemo(
    () =>
      buildVehicleEntryJson(
        exportVId.trim() || "my-vehicle",
        exportName.trim() || "My vehicle",
        mainRgb,
        accentRgb,
        parts
      ),
    [exportVId, exportName, mainRgb, accentRgb, parts]
  );

  const showJson = exportTab === "parts" ? bodyJson : fullJson;

  const copyExport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(showJson);
      setCopyHint("Copied to clipboard.");
      setTimeout(() => setCopyHint(null), 2000);
    } catch {
      setCopyHint("Copy failed — select the text below.");
      setTimeout(() => setCopyHint(null), 3000);
    }
  }, [showJson]);

  const applyImport = useCallback(() => {
    try {
      const next = parseBodyPartsImport(importText);
      setParts(next);
      setSelectedId(next[0]?.id ?? null);
      setImportHint(`Imported ${next.length} part${next.length === 1 ? "" : "s"}.`);
      setTimeout(() => setImportHint(null), 3500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed.";
      setImportHint(msg);
    }
  }, [importText]);

  const updateSelected = useCallback(
    (patch: Partial<Omit<PartRow, "id">>) => {
      if (!selectedId) return;
      setParts((prev) =>
        prev.map((p) => (p.id === selectedId ? { ...p, ...patch } : p))
      );
    },
    [selectedId]
  );

  const addPart = useCallback((type: VehicleBodyPart["type"]) => {
    const row: PartRow = {
      id: newId(),
      type,
      pos: [0, 0, 0],
      size:
        type === "cube"
          ? [0.4, 0.4, 0.4]
          : type === "cylinder"
            ? [0.2, 0.35, 8]
            : [0.2, 10, 8],
      color: "main",
    };
    setParts((prev) => [...prev, row]);
    setSelectedId(row.id);
  }, []);

  const removeSelected = useCallback(() => {
    if (!selectedId || parts.length <= 1) return;
    const idx = parts.findIndex((p) => p.id === selectedId);
    const next = parts.filter((p) => p.id !== selectedId);
    const fallback = next[Math.max(0, idx - 1)] ?? next[0];
    setParts(next);
    setSelectedId(fallback.id);
  }, [selectedId, parts]);

  const duplicatePart = useCallback((id: string) => {
    const nid = newId();
    setParts((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const o = prev[idx];
      const color =
        o.color === undefined
          ? undefined
          : o.color === "main" || o.color === "accent"
            ? o.color
            : ([o.color[0], o.color[1], o.color[2]] as [
                number,
                number,
                number,
              ]);
      const copy: PartRow = {
        id: nid,
        type: o.type,
        pos: [o.pos[0], o.pos[1], o.pos[2]],
        size: [o.size[0], o.size[1], o.size[2]],
        rotDeg: o.rotDeg
          ? [o.rotDeg[0], o.rotDeg[1], o.rotDeg[2]]
          : undefined,
        color,
        polygonOffset: o.polygonOffset,
      };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
    setSelectedId(nid);
  }, []);

  const onPartTransform = useCallback(
    (id: string, patch: Partial<Omit<PartRow, "id">>) => {
      setParts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );
    },
    []
  );

  const vehicleForQuery = useMemo(
    () => ({
      ...playerVehicle,
      id: exportVId.trim() || playerVehicle.id,
    }),
    [playerVehicle, exportVId]
  );
  const vehicleQuery = vehicleIdForQueryString(vehicleForQuery);

  const goHome = useCallback(() => {
    router.push(
      vehicleQuery ? `/?vehicle=${encodeURIComponent(vehicleQuery)}` : "/"
    );
  }, [router, vehicleQuery]);

  const goPlaza = useCallback(() => {
    router.push(
      vehicleQuery
        ? `/plaza?vehicle=${encodeURIComponent(vehicleQuery)}`
        : "/plaza"
    );
  }, [router, vehicleQuery]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Canvas
        className="absolute inset-0 h-full w-full"
        shadows
        camera={{ position: [2.8, 1.9, 3.2], fov: 45, near: 0.05, far: 200 }}
      >
        <color attach="background" args={["#9fd9f6"]} />
        <ambientLight intensity={0.55} />
        <directionalLight
          castShadow
          intensity={1.15}
          position={[6, 10, 4]}
          shadow-mapSize={[1024, 1024]}
        />
        <VehicleBuilderScene
          parts={parts}
          mainRgb={mainRgb}
          accentRgb={accentRgb}
          selectedId={selectedId}
          gizmoMode={gizmoMode}
          onPartTransform={onPartTransform}
        />
      </Canvas>

      <aside
        className="pointer-events-auto absolute left-3 top-3 z-10 flex max-h-[calc(100vh-24px)] w-[min(380px,calc(100vw-24px))] flex-col gap-3 overflow-y-auto rounded-xl border border-white/40 bg-white/88 p-3 text-sm shadow-lg backdrop-blur-sm"
        style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
      >
        <h1 className="text-base font-semibold text-slate-800">
          Vehicle body builder
        </h1>
        <p className="text-xs text-slate-600">
          Orbit: drag (empty space) · Zoom: wheel — Gizmo on selected part — Paste
          exports into{" "}
          <code className="rounded bg-slate-200/80 px-1">data/defaultVehicles.json</code>
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            onClick={goHome}
          >
            Home
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            onClick={goPlaza}
          >
            Plaza
          </button>
        </div>

        <section className="space-y-2 border-t border-slate-200/80 pt-2">
          <div className="text-xs font-medium text-slate-700">3D gizmo</div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["translate", "Move"],
                ["rotate", "Rotate"],
                ["scale", "Scale"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                disabled={!selectedId}
                className={`rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-40 ${
                  gizmoMode === mode
                    ? "bg-violet-700 text-white"
                    : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                }`}
                onClick={() => setGizmoMode(mode)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500">
            Drag colored axes on the selected part. Scale updates the part&apos;s{" "}
            <code className="rounded bg-slate-200/80 px-0.5">size</code> values.
          </p>
        </section>

        <section className="space-y-2 border-t border-slate-200/80 pt-2">
          <div className="text-xs font-medium text-slate-700">Vehicle colors</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[11px] text-slate-600">
              Main
              <RgbColorInput rgb={mainRgb} onChange={setMainRgb} />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-slate-600">
              Accent
              <RgbColorInput rgb={accentRgb} onChange={setAccentRgb} />
            </label>
          </div>
        </section>

        <section className="space-y-2 border-t border-slate-200/80 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-700">Parts</span>
            <button
              type="button"
              className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700"
              onClick={() => addPart("cube")}
            >
              + Cube
            </button>
            <button
              type="button"
              className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700"
              onClick={() => addPart("cylinder")}
            >
              + Cylinder
            </button>
            <button
              type="button"
              className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700"
              onClick={() => addPart("sphere")}
            >
              + Sphere
            </button>
            <button
              type="button"
              disabled={!selectedId || parts.length <= 1}
              className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-700 enabled:hover:bg-red-50 disabled:opacity-40"
              onClick={removeSelected}
            >
              Remove selected
            </button>
          </div>
          <ul className="max-h-28 space-y-1 overflow-y-auto rounded border border-slate-200/80 bg-white/90 p-1">
            {parts.map((p) => (
              <li
                key={p.id}
                className={`flex items-center gap-0.5 rounded pr-0.5 ${
                  p.id === selectedId
                    ? "bg-sky-200/90"
                    : "hover:bg-slate-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className="min-w-0 flex-1 rounded px-2 py-1 text-left text-xs text-slate-800"
                >
                  {p.type} @ [{p.pos.map((n) => n.toFixed(2)).join(", ")}]
                </button>
                <button
                  type="button"
                  title="Duplicate part"
                  aria-label="Duplicate part"
                  className="shrink-0 rounded p-1 text-slate-500 hover:bg-sky-300/50 hover:text-slate-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicatePart(p.id);
                  }}
                >
                  <DuplicatePartIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {selected && (
          <section className="space-y-2 border-t border-slate-200/80 pt-2">
            <div className="text-xs font-medium text-slate-700">
              Selected part ({selected.type})
            </div>
            <Vec3Fields
              label="Position"
              v={selected.pos}
              onChange={(pos) => updateSelected({ pos })}
            />
            <Vec3Fields
              label="Size"
              v={selected.size}
              onChange={(size) => updateSelected({ size })}
              step={0.02}
            />
            <label className="flex flex-col gap-1 text-[11px] text-slate-600">
              Rotation (deg) X Y Z
              <div className="grid grid-cols-3 gap-1">
                {([0, 1, 2] as const).map((i) => (
                  <input
                    key={i}
                    type="number"
                    step={1}
                    className="w-full rounded border border-slate-300 px-1 py-0.5 text-xs"
                    value={selected.rotDeg?.[i] ?? 0}
                    onChange={(e) => {
                      const next = [...(selected.rotDeg ?? [0, 0, 0])] as [
                        number,
                        number,
                        number,
                      ];
                      next[i] = Number(e.target.value) || 0;
                      updateSelected({ rotDeg: next });
                    }}
                  />
                ))}
              </div>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-slate-600">
              Part color
              <select
                className="rounded border border-slate-300 px-1 py-1 text-xs"
                value={colorMode(selected.color)}
                onChange={(e) => {
                  const m = e.target.value as "main" | "accent" | "rgb";
                  if (m === "main") updateSelected({ color: "main" });
                  else if (m === "accent") updateSelected({ color: "accent" });
                  else
                    updateSelected({
                      color: [
                        mainRgb[0],
                        mainRgb[1],
                        mainRgb[2],
                      ] as [number, number, number],
                    });
                }}
              >
                <option value="main">Main</option>
                <option value="accent">Accent</option>
                <option value="rgb">Custom RGB</option>
              </select>
            </label>
            {colorMode(selected.color) === "rgb" && Array.isArray(selected.color) && (
              <RgbColorInput
                rgb={selected.color as [number, number, number]}
                onChange={(rgb) => updateSelected({ color: rgb })}
              />
            )}
            <label className="flex items-center gap-2 text-[11px] text-slate-600">
              <input
                type="checkbox"
                checked={selected.polygonOffset === true}
                onChange={(e) =>
                  updateSelected({
                    polygonOffset: e.target.checked ? true : undefined,
                  })
                }
              />
              polygonOffset (reduce z-fighting)
            </label>
          </section>
        )}

        <section className="space-y-2 border-t border-slate-200/80 pt-2">
          <div className="text-xs font-medium text-slate-700">Import bodyParts</div>
          <p className="text-[10px] text-slate-500">
            Paste a <code className="rounded bg-slate-200/80 px-0.5">bodyParts</code>{" "}
            JSON array, or a full vehicle object (uses its{" "}
            <code className="rounded bg-slate-200/80 px-0.5">bodyParts</code> field).
          </p>
          <textarea
            className="h-28 w-full resize-y rounded border border-slate-300 bg-white p-2 font-mono text-[11px] leading-snug text-slate-800 placeholder:text-slate-400"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='[ { "type": "cube", "pos": [0,0,0], "size": [1,1,1], "color": "main" } ]'
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
              onClick={applyImport}
            >
              Import
            </button>
            {importHint && (
              <span
                className={`text-xs ${
                  importHint.startsWith("Imported")
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                {importHint}
              </span>
            )}
          </div>
        </section>

        <section className="space-y-2 border-t border-slate-200/80 pt-2">
          <div className="text-xs font-medium text-slate-700">Export JSON</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                exportTab === "parts"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-200 text-slate-800"
              }`}
              onClick={() => setExportTab("parts")}
            >
              bodyParts only
            </button>
            <button
              type="button"
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                exportTab === "full"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-200 text-slate-800"
              }`}
              onClick={() => setExportTab("full")}
            >
              Full vehicle row
            </button>
            <button
              type="button"
              className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
              onClick={copyExport}
            >
              Copy
            </button>
          </div>
          {exportTab === "full" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-0.5 text-[11px] text-slate-600">
                v_id
                <input
                  className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                  value={exportVId}
                  onChange={(e) => setExportVId(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[11px] text-slate-600">
                name
                <input
                  className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                  value={exportName}
                  onChange={(e) => setExportName(e.target.value)}
                />
              </label>
            </div>
          )}
          {copyHint && (
            <div className="text-xs text-emerald-700">{copyHint}</div>
          )}
          <textarea
            readOnly
            className="h-40 w-full resize-y rounded border border-slate-300 bg-slate-50/90 p-2 font-mono text-[11px] leading-snug text-slate-800"
            value={showJson}
            spellCheck={false}
          />
          <p className="text-[10px] text-slate-500">
            Full row matches <code>data/defaultVehicles.json</code> entries (physics
            fields copied from the default vehicle; adjust in the file after paste).
          </p>
        </section>
      </aside>
    </div>
  );
}

function rgbTupleToHex(rgb: readonly [number, number, number]): string {
  const [r, g, b] = rgb.map((n) =>
    Math.min(255, Math.max(0, Math.round(Number(n))))
  );
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function RgbColorInput({
  rgb,
  onChange,
}: {
  rgb: [number, number, number];
  onChange: (v: [number, number, number]) => void;
}) {
  return (
    <input
      type="color"
      value={rgbTupleToHex(rgb)}
      onChange={(e) => onChange(hexToRgbTuple(e.target.value))}
      className="h-9 w-full max-w-[140px] cursor-pointer rounded border border-slate-300 bg-white p-0.5"
      title={`RGB ${rgb.join(", ")}`}
    />
  );
}

function Vec3Fields({
  label,
  v,
  onChange,
  step = 0.05,
}: {
  label: string;
  v: readonly [number, number, number];
  onChange: (v: [number, number, number]) => void;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-slate-600">
      {label} X Y Z
      <div className="grid grid-cols-3 gap-1">
        {([0, 1, 2] as const).map((i) => (
          <input
            key={i}
            type="number"
            step={step}
            className="w-full rounded border border-slate-300 px-1 py-0.5 text-xs"
            value={v[i]}
            onChange={(e) => {
              const next = [...v] as [number, number, number];
              next[i] = Number(e.target.value) || 0;
              onChange(next);
            }}
          />
        ))}
      </div>
    </label>
  );
}
