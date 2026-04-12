# UI design style (Good Good Shot)

This project leans toward **Frutiger Aero**–adjacent UI: glossy glass, cyan–white gradients, soft depth, and rounded “bubble” shells rather than flat rectangles. Modals and HUD elements should feel light, buoyant, and slightly aquatic.

## Principles

1. **Glass + gradient** — Use `backdrop-filter` blur with layered `radial-gradient` / `linear-gradient` backgrounds. A thin white border and inset highlights sell the glass edge.
2. **Asymmetric shells** — Prefer uneven corner radii (e.g. `38px 30px 42px 34px`) so panels feel organic, not template boxes.
3. **Blob layer** — Decorative soft glows sit in a **child** with `position: absolute; inset: 0; border-radius: inherit; overflow: hidden` so blurs stay clipped while the outer shell can use `overflow: visible` for rim elements.
4. **Rim‑anchored actions** — Primary buttons often sit half outside the card: wrap content in `position: relative`, then place the CTA in a layer with `position: absolute; left: 0; right: 0; bottom: 0; transform: translateY(50%)` and give the inner content extra `paddingBottom` so nothing overlaps.
5. **Help** — A circular **“i”** control (top‑right, slightly overlapping the rim) opens `HelpModal` via `onOpenHelp`.
6. **Copy** — Short, punchy lines for onboarding and outcomes. Battle framing (aim, power, vehicles); avoid golf terms like “par” or “hole” in player‑facing blurbs where we mean **coin budget** or **lane**.
7. **Tokens** — Prefer `hudColors`, `hudFont`, and shared helpers from `components/gameHudStyles.ts` for consistency.

## Reference: modal shell (glass bubble)

```css
.finishModalShell {
  position: relative;
  isolation: isolate;
  overflow: visible;
  backdrop-filter: blur(18px) saturate(1.15);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
  border-radius: 38px 30px 42px 34px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow:
    inset 0 2px 8px rgba(255, 255, 255, 0.9),
    inset 0 -18px 36px rgba(0, 185, 230, 0.07),
    0 28px 70px rgba(0, 45, 95, 0.3),
    0 0 0 1px rgba(0, 210, 255, 0.22);
  background-image:
    radial-gradient(ellipse 125% 90% at 50% -18%, rgba(255, 255, 255, 0.99) 0%, transparent 55%),
    radial-gradient(ellipse 70% 55% at 92% 8%, rgba(180, 255, 255, 0.45) 0%, transparent 58%),
    linear-gradient(
      162deg,
      rgba(255, 255, 255, 0.97) 0%,
      rgba(220, 248, 255, 0.93) 40%,
      rgba(150, 225, 255, 0.88) 100%
    );
}
```

## Reference: blob layer (clipped, behind content)

```css
.blobLayer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  overflow: hidden;
  z-index: 0;
}

.blobLayer::before {
  content: "";
  position: absolute;
  top: -20%;
  left: -14%;
  width: 58%;
  height: 44%;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, rgba(160, 250, 255, 0.52) 0%, transparent 68%);
  filter: blur(36px);
  opacity: 0.92;
}
```

## Reference: bottom‑anchored CTA (half out of the card)

```css
.contentWrap {
  position: relative;
  padding-bottom: 72px; /* room for the button that hangs below */
}

.actionsAnchor {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  transform: translateY(50%);
  display: flex;
  flex-direction: column;
  z-index: 2;
}
```

## Reference: circular “i” help control

```css
.helpBubble {
  position: absolute;
  top: 8px;
  right: 12px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  transform: translate(36%, -40%);
  z-index: 3;
  background: radial-gradient(
    circle at 38% 30%,
    rgba(255, 255, 255, 0.98) 0%,
    rgba(140, 235, 255, 0.78) 40%,
    rgba(0, 175, 225, 0.55) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.75),
    0 6px 18px rgba(0, 82, 130, 0.32);
}
```

## TypeScript tokens (project)

From `components/gameHudStyles.ts`:

- `hudColors.value` — primary numeric/title navy
- `hudColors.label` — secondary/muted blue for labels
- `modalBackdrop` — full‑screen dimmed overlay for dialogs
- `goldPillButtonStyle({ disabled, fullWidth })` — primary pill CTA
- **`plazaGlassCapsuleButtonStyle()`** — cyan glossy capsule (e.g. **Menu** on the plaza HUD)
- **`plazaMultiplayerCapsuleButtonStyle()`** — violet / orchid glossy capsule, same family as the landing screen **Multiplayer / Online** tile (`glassFaceMultiplayer`); use for the plaza **Multiplayer** control so online entry matches the start screen
- **`plazaPvpDockButtonStyle({ variant })`** — stacked actions inside **Multiplayer** modal (`create` | `join` | `quick`)

Modal titles on light glass cards should use **`hudColors.value`** (navy) plus a light `textShadow` for contrast—not washed‑out white on pale blue.

When adding new modals, mirror **StartGameModal** / **FinishGameModal** / **SessionEndModal** patterns: shell + blobs + optional help bubble + anchored actions.
