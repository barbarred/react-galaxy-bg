# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@r0rri/react-galaxy-bg` is a single-component npm library: an animated starfield background for React. There is no app, no demo page, and no test suite in the repo. Everything ships from `src/` through Rollup into `dist/`.

The README and most source comments are written in Spanish. Match that language when editing them.

## Commands

```bash
npm run build      # rollup -c → dist/index.js (cjs), dist/index.esm.js (esm), dist/*.d.ts
npm run dev        # rollup -c -w, rebuild on change
npm run typecheck  # tsc --noEmit over src only
npm test           # bundle the harness, then run the Playwright smoke suite
```

`npm test` first runs `build:harness`, a second Rollup config that bundles `test/harness.tsx` together with React into an IIFE at `test/harness.js`. React 19 ships no UMD build, so bundling is the only way to load it from a plain script tag; that in turn lets the suite run against `file://` with no static server and no CDN. The harness reads its props from the query string and mounts under `StrictMode`, which is what keeps the double-invoke guard covered.

To run one test, use the built-in runner's filter, and rebuild the harness first if `src/` changed:

```bash
npm run build:harness
node --test --test-name-pattern "bucle vertical" test/smoke.test.mjs
```

Chromium in `~/.cache/ms-playwright` may be a different build number than the installed Playwright expects. Rather than downloading another copy, point the suite at the existing binary:

```bash
PLAYWRIGHT_CHROMIUM_PATH=~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome npm test
```

CI has no such mismatch and just runs `npx playwright install --with-deps chromium`. There is still no lint step.

For a change you want to look at rather than assert on, `test-app/index.html` is a gitignored panel with live controls for every prop. Serve the repo root and open it; it imports `dist/index.esm.js`, so rebuild after touching `src/`.

```bash
python3 -m http.server 8080 --directory .   # then open /test-app/index.html
```

`dist/` is gitignored, so a fresh clone has no build output until `npm run build` runs. `prepublishOnly` rebuilds automatically on publish.

## Branching and release

Day-to-day work lands on `develop`; `main` mirrors what is published to npm. Feature branches open PRs into `develop`, and a release is a PR from `develop` into `main` followed by a tag.

CI runs on pushes and PRs to both branches: typecheck, build, smoke suite, and `npm pack --dry-run`.

Releases are tag-driven. `npm version <patch|minor|major>` on `main`, then `git push --follow-tags`; the tag triggers `release.yml`, which refuses to publish if the tag and `package.json` disagree. Publishing uses npm trusted publishing over OIDC, so there is no `NPM_TOKEN` anywhere. That requires `id-token: write` and npm 11.5.1 or newer, which is why the workflow upgrades npm before publishing. Never add a publish step that expects a token; if publishing fails with an auth error, the trusted-publisher config on npmjs.com is what is wrong, not the workflow.

The lockfile is committed on purpose, because `npm ci` needs it. Do not re-add it to `.gitignore`.

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
