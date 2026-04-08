/** Shared dimensions and materials for `BlockyTree` and `InstancedBlockyTrees` (must stay in sync). */

export const BLOCKY_TREE_TRUNK_W = 0.52;
export const BLOCKY_TREE_TRUNK_H = 1.9;
export const BLOCKY_TREE_TRUNK_D = 0.52;

export const BLOCKY_TREE_LEAF = 0.72;

export type BlockyTreeLeafSpec = {
  pos: readonly [number, number, number];
  rot: readonly [number, number, number];
};

export const BLOCKY_TREE_LEAVES: readonly BlockyTreeLeafSpec[] = [
  { pos: [0, 0, 0], rot: [0, 0.35, 0] },
  { pos: [0.32, 0.1, 0.18], rot: [0.12, -0.28, 0.08] },
  { pos: [-0.34, 0.07, -0.16], rot: [-0.1, 0.4, -0.06] },
  { pos: [0.16, -0.12, 0.32], rot: [0.15, 0.2, -0.12] },
  { pos: [-0.26, 0.16, 0.22], rot: [-0.08, -0.35, 0.1] },
  { pos: [0.1, 0.18, -0.35], rot: [0.1, 0.15, 0.22] },
];

export const BLOCKY_TREE_TRUNK_COLOR = "#5c3d2e";
export const BLOCKY_TREE_LEAF_COLORS = [
  "#3e874e",
  "#4b9b5c",
  "#448a52",
  "#3c7d4b",
  "#4ea55f",
  "#418750",
] as const;
