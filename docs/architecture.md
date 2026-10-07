# Architecture

## Repo layout

```
src/
  index.ts                    # entry: imports styles/index.css, exports + registers all elements
  components/                 # Lit elements (one file per element pair)
    internal/                 # shared helpers: slots.ts (slotHasContent), dismiss.ts (DismissController)
  styles/
    index.css                 # global stylesheet entry → builds to dist/cyber-ui.css
    tokens.css                # base + derived design tokens
    themes.css                # built-in data-cyber-theme palettes
    base.css                  # opt-in typography/page helpers (no resets)
    effects.css               # .cyber-fx-* decorative classes
    components/*.css          # one file per component, class-based selectors only
demo/                         # Vite demo site (dev playground; deployed to the dedicated demo website)
  index.html, main.js         # bundled demo (npm run dev)
  standalone.html             # no-bundler smoke test of the built dist/
smoke/
  react/, vue/                # framework integration smoke apps (consume smoke/cyber-ui.tgz)
tests/                        # Vitest browser-mode tests (one file per interactive component)
docs/                         # this documentation
dist/                         # build output (gitignored; produced by prepack / npm run build)
.github/workflows/
  ci.yml                      # typecheck + build + tests + smoke-app builds on push/PR
```

## One stylesheet, two consumers

The core architectural rule: **component styles are authored once in
`src/styles/components/*.css` and consumed twice** —

1. bundled into the global `cyber-ui.css` via `src/styles/index.css`, serving
   the class-only API;
2. imported with Vite's `?inline` into the matching Lit element and injected
   into its shadow root (`unsafeCSS`).

Tokens on `:root` inherit through shadow DOM, so both layers retheme together
and the class version and element version of a component can't drift apart.

Consequences to respect when editing:

- Keep selectors in `components/*.css` **class-based** (`.cyber-card__title`,
  not `h3`), so they work both globally and inside a shadow root.
- Styles that only make sense on the host element (positioning, `:host`
  variants, slotted mirrors) live in the component's TS file as a second `css`
  block, not in the shared CSS file.
- Light-DOM content slotted into an element can't be reached by shadow styles
  except via `::slotted()` — that's why `cyber-card` and `cyber-dropdown` carry
  small mirrors of `.cyber-link` / `.cyber-menu__item`. If you change those
  skins in CSS, update the mirrors.
- Derived tokens are re-declared on every `[data-cyber-theme]` scope and inside
  color variants — see [Theming → derived tokens](theming.md#derived-tokens) for
  why.

## Elements

All elements are Lit 3, defined with `@customElement`, exported from
`src/index.ts` (importing the package registers them — the package marks
`sideEffects` accordingly). Conventions:

- Events: `cyber-*` named `CustomEvent`s, always
  `{ bubbles: true, composed: true }`.
- Public state is a reflected attribute/property (`open`, `selected`) plus
  imperative methods (`show()`/`close()`/`toggle()`).
- Expose `part` attributes on the significant shadow nodes.
- Optional slots use `slotchange` + `slotHasContent()` to collapse empty
  sections.
- Add the tag to `HTMLElementTagNameMap` in a `declare global` block.
- Shared behavior lives in `src/components/internal/` (`DismissController` =
  Escape + outside-click dismissal).

## Build & scripts

| Script               | What it does                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm run dev`        | Vite dev server, demo at `localhost:5173` (`demo/index.html`)                                                   |
| `npm run build`      | Library build: `dist/cyber-ui.js` + `dist/cyber-ui.css` (vite) + `dist/**/*.d.ts` (tsc `--emitDeclarationOnly`) |
| `npm run build:demo` | Demo site build to `demo-dist/` (`vite.demo.config.ts`, relative base) — deploy to the demo website             |
| `npm run typecheck`  | `tsc --noEmit -p tsconfig.test.json` (covers `src/`, `tests/` and the config files)                             |
| `npm run test`       | Browser test suite: Vitest browser mode in headless Chromium (`vitest.config.ts`, `tests/`)                     |
| `npm run test:watch` | Same suite, watch mode                                                                                          |
| `npm run pack:smoke` | `npm pack` the library into `smoke/cyber-ui.tgz` (what the smoke apps install)                                  |
| `npm run preview`    | Preview the built demo                                                                                          |

Package exports: `.` → `dist/cyber-ui.js` (+ types), `./styles.css` →
`dist/cyber-ui.css`. Lifecycle hooks: `prepack` runs the library build (so any
`npm pack`/`npm publish` ships a fresh `dist/`), `prepublishOnly` runs
typecheck + tests as a publish gate.

## Tests

`tests/*.test.ts` run with Vitest **browser mode** in real headless Chromium
(Playwright provider) — the components depend on platform behavior (native
`<dialog>.showModal`, shadow-DOM slot assignment, focus management) that DOM
emulators don't implement faithfully. One file per interactive component plus
`helpers.ts` (fixture mount/cleanup, event capture, synthetic keydown). First
run locally needs `npx playwright install chromium`.

When changing an element's behavior, extend its test file in the same change —
events, keyboard navigation, and open/close state transitions are the contract.

## Verification

- **Tests** (`npm run test`): behavioral contract of the interactive elements.
- **Demo** (`demo/`): every component and theme should be represented; it's the
  visual regression surface.
- **`demo/standalone.html`**: loads the built `dist/` directly with no bundler —
  run a static server from the repo root after `npm run build`. Catches
  bundling/registration regressions.
- **Smoke apps** (`smoke/react`, `smoke/vue`): install `smoke/cyber-ui.tgz`
  (regenerate with `npm run pack:smoke`) to verify real-world install,
  custom-element events and framework config.

## CI / deployment

- `.github/workflows/ci.yml`: on every push to `main` and every PR —
  typecheck, library build, browser tests, and a matrix job that packs the
  library and builds both smoke apps against the tarball (catches packaging
  regressions: exports map, `sideEffects`, missing files).
- Demo deployment is external: `npm run build:demo` produces `demo-dist/`
  (static, relative base so it works at any path), which is published to the
  dedicated demo website outside this repo.

## Releasing

1. Update the version in `package.json` and move the `Unreleased` notes in
   `CHANGELOG.md` under the new version heading.
2. `npm publish` — `prepublishOnly` runs typecheck + tests, `prepack` builds.
3. Tag the release: `git tag v<version> && git push --tags`.
