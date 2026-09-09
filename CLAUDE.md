# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@r0rri/react-galaxy-bg` is a single-component npm library: an animated starfield background for React. There is no app, no demo page, and no test suite in the repo. Everything ships from `src/` through Rollup into `dist/`.

The README and most source comments are written in Spanish. Match that language when editing them.

## Commands

```bash
npm run build   # rollup -c → dist/index.js (cjs), dist/index.esm.js (esm), dist/*.d.ts
npm run dev     # rollup -c -w, rebuild on change
npx tsc --noEmit  # typecheck only (build also typechecks via @rollup/plugin-typescript)
```

There is no lint step and no test runner. `npm test` is a stub that echoes and exits 0, so there is no way to run a single test. If you add tests, also add the runner and its dev dependency.

To try a change in a real app, build first and consume the package via `npm link` or a file path. To eyeball the variants without an app, serve `dist/index.esm.js` next to a small HTML page that pulls React from a CDN through an import map, then drive it with Playwright. Chromium is already in `~/.cache/ms-playwright`, but the installed Playwright package may expect a different build number, so pass `executablePath` explicitly instead of running `playwright install`. `dist/` is gitignored, so a fresh clone has no build output until `npm run build` runs. `prepublishOnly` rebuilds automatically on publish.

Work happens on `develop`; `main` is the default branch and PR target.

## Architecture

Two files hold the whole library. [src/index.ts](src/index.ts) re-exports, and [src/GalaxyComponent.tsx](src/GalaxyComponent.tsx) is the component.

**Layers are data, not markup.** A `LayerSpec` array describes each layer: which of the three count props feeds it, what fraction of that count it takes, dot size, keyframe name, duration, delay, and whether it needs the loop duplicate. `SCROLL_LAYERS` has 3 entries, `NEBULA_LAYERS` has 9 (three per size, so the same total dots spread over more elements with different drift vectors and phases). The render is a `map` over that array. A new variant is a new array, not new JSX or new CSS blocks.

**Stars are box-shadows, not elements.** Each layer div renders one dot sized by `--galaxy-size`, and its whole starfield is a long `box-shadow` list in `--galaxy-layer`. Both custom properties are set inline per layer element, so the injected CSS stays static and generic. Adding stars means lengthening that string, never appending DOM nodes. Colors are per-dot because each shadow carries its own color, which is how `palette` works without any extra machinery.

**Star positions are set twice.** First render emits a deterministic, deliberately small fallback field (`FALLBACK_COUNT` dots) built from a seeded PRNG, so server and client agree and there is no hydration mismatch. After mount, `updateStarsForCurrentViewport` overwrites `--galaxy-layer` on each element via direct DOM writes, using `Math.random` and the real viewport, bypassing React entirely.

**Star count props are honored exactly by default.** The viewport-proportional cap (`width * 0.5`, `0.15`, `0.08` per source) lives behind the opt-in `adaptiveDensity` prop. `updateStarsForCurrentViewport` takes a `force` flag so init and prop changes regenerate even when the width has not moved; resize events call it unforced and stay subject to the 100px threshold.

**The scroll loop depends on an exact number.** `SCROLL_LOOP` (2000) is simultaneously the y-range stars are scattered over, the `top` offset of the `::after` duplicate, and the translate distance in `galaxy-animStar`. All three must stay equal or the field shows a gap or a seam. The nebula variant does not use the duplicate and scatters over the real viewport height plus a margin for the drift.

**All CSS lives in a template string** inside the mount effect, injected once into `document.head` under the id `galaxy-component-styles-v3`. There is no stylesheet to import and no CSS build step. Bump that id whenever the CSS changes shape, otherwise a stale tag from an older version of the package wins. The id guard also means an edited style string will not replace the already-injected tag during hot reload until a full page reload.

**Animation control is CSS-driven.** Per-layer `animationName`, duration, delay and timing come from the layer spec as inline styles; the keyframes themselves are static. Nebula drift uses six keyframe variants (`galaxy-drift-a` through `-f`) that all return to the origin at 100% so the infinite loop is seamless, with negative delays to desynchronize the groups. Shooting stars restart by setting `animation: 'none'`, reading `offsetHeight` to force a reflow, then reassigning the shorthand; a `setInterval` replays the sequence every 10 seconds. Nothing here uses the Web Animations API despite some of the naming. Because durations are inline styles, the reduced-motion override needs `!important` to win.

**Prop identity matters.** `palette` is normally passed as an array literal, so it is compared by a serialized key rather than by reference. Without that, every parent render would produce a new palette, a new `pickColor`, a new `init`, and a full teardown and re-init of the component. Keep any new object or array prop out of the `init` dependency chain the same way.

**Lifecycle guards to preserve when editing.** `initializedRef` keeps `init` from running twice under StrictMode double-invoke. Resize is debounced at 250ms and additionally skipped when the width moved less than 100px. `visibilitychange` toggles `animationPlayState` on `.galaxy-layer` and `.galaxy-shooting-star` so a backgrounded tab stops animating. The effect cleanup clears both timers and resets the init flag.

Every `window` and `document` access outside the effect body is guarded by `typeof window !== 'undefined'`; keep new code SSR-safe the same way.

## Packaging constraints

- Peer dependency range spans React 16.8 through 19. Do not use APIs newer than React 16.8 without widening or narrowing that range.
- `tsconfig.json` targets ES5 with `strict` on. Avoid syntax the ES5 target cannot lower cleanly.
- React and ReactDOM are external in the Rollup config and are also stripped by `rollup-plugin-peer-deps-external`. Never bundle them.
- In `package.json`, the `exports` map must keep `types` as the first condition. A commit already fixed a types resolution warning caused by the wrong order.
- The package has zero runtime dependencies. Keep it that way.
