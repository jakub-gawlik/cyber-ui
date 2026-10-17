# Architecture

## Repo layout

```
src/
  index.ts                    # all-in-one entry: imports styles/index.css, exports + registers all elements
  components/                 # Lit elements (one file per element pair; each is also its own entry point)
    internal/                 # shared helpers: slots.ts, dismiss.ts (DismissController), typeahead.ts,
                              #   form-control.ts / text-control.ts / toggle-control.ts (form element bases)
  styles/
    index.css                 # global stylesheet entry (@import … layer()) → builds to dist/cyber-ui.css
    tokens.css                # base + derived design tokens
    themes.css                # built-in data-cyber-theme palettes
    base.css                  # opt-in typography/page helpers (no resets)
    effects.css               # .cyber-fx-* decorative classes
    components/*.css          # one file per component, class-based selectors only
smoke/
  react/, vue/                # framework integration smoke apps (consume smoke/cyber-ui.tgz)
tests/                        # Vitest browser-mode tests (one file per interactive component)
  types/                      # tsc type tests against the built package (npm run typecheck:dist)
scripts/
  cem-plugins.mjs             # custom-elements-manifest plugins (event filter, dist paths, React/Vue typings)
docs/                         # developer documentation (user docs live on https://cyberui.art)
dist/                         # build output (gitignored; produced by prepack / npm run build)
vite.config.ts                # library build: entries, lit external, layered per-file CSS
custom-elements-manifest.config.mjs  # manifest + VS Code / JetBrains / React / Vue outputs
eslint.config.js, .prettierrc.json, .size-limit.json  # lint, format, bundle budgets
.github/workflows/
  ci.yml                      # lint, format, typecheck, build, dist types, size, tests, smoke builds on push/PR
  release.yml                 # tag-driven npm publish + GitHub release (the only publish path)
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
- Derived tokens (`--cyber-border`, `--cyber-glow`, `--cyber-scrim`, … —
  `color-mix()` over the base colors) are re-declared on `:root`, on every
  `[data-cyber-theme]` scope and inside color variants (`.cyber-btn--danger`,
  …). CSS resolves `var()` inside a custom property where the property is
  _defined_, not where it's used, so without the re-declaration a scoped theme
  would inherit stale `:root` borders/glows. Keep this pattern when adding
  tokens or variants.
- The `:root` defaults in `tokens.css` and the `netrunner` block in
  `themes.css` must stay identical.

### Cascade layers

Every published stylesheet puts its rules in a cascade layer, lowest
priority first: `cyber-ui.tokens` (tokens.css, themes.css) →
`cyber-ui.base` → `cyber-ui.components` → `cyber-ui.fx` (effects.css). Any
unlayered consumer CSS beats all of them regardless of specificity, and fx
utilities beat component backgrounds when composed. The all-in-one
`dist/cyber-ui.css` gets its layers from the `@import "…" layer(…)` statements
in `src/styles/index.css`. The per-file `dist/styles/*.css` are produced by a
small plugin in `vite.config.ts` that wraps each source file in its layer and
restates the layer order at the top, so the order holds whichever file is
imported first.

The source files themselves stay unlayered: they are also injected into
shadow roots via `?inline`, where layering them would let each element's
own `css` block (unlayered) outrank them regardless of specificity. That's a
behavior change shadow styles don't need, since consumers can't reach into
shadow roots except via `::part()`. When adding a stylesheet, add it to
`index.css` with its layer and to the file list in `vite.config.ts`.

## Elements

All elements are Lit 3, defined with `@customElement`, exported from
`src/index.ts` (importing the package registers them — the package marks
`sideEffects` accordingly). Conventions:

- Document the public API with JSDoc tags the manifest analyzer reads:
  `@slot`, `@csspart`, `@fires {CustomEvent<Detail>} cyber-name - …`, and
  `@attr` for attribute-only API; mark public-but-internal members
  `@internal`. Reactive properties are picked up from the Lit decorators.
  The generated manifest, IDE data and React/Vue typings are only as good
  as these tags.

- Events: `cyber-*` named `CustomEvent`s, always
  `{ bubbles: true, composed: true }`. Exception: form elements fire the
  native-style `input` and `change` events (see Form elements), because
  that is what form libraries and framework bindings listen for.
- Public state is a reflected attribute/property (`open`, `selected`) plus
  imperative methods (`show()`/`close()`/`toggle()`).
- Expose `part` attributes on the significant shadow nodes.
- Optional slots use `slotchange` + `slotHasContent()` to collapse empty
  sections.
- Add the tag to `HTMLElementTagNameMap` in a `declare global` block.
- Shared behavior lives in `src/components/internal/` (`DismissController` =
  Escape + outside-click dismissal). Escape is scoped: one shared document
  listener picks a single open overlay per key press — the one the event
  path is inside, else the one holding focus, else the top-most (most
  recently opened) — and `preventDefault()`s the event instead of stopping
  propagation, so a surrounding `<dialog>` doesn't also close. Open state is
  sampled in `hostUpdated`, so hosts need no extra wiring.
- ARIA id references can't cross a shadow boundary. When an element needs
  `aria-controls` / `aria-labelledby` between generated controls and
  slotted content, both ends live in the shadow root: `<cyber-tabs>` wraps
  each slotted panel in a shadow `role="tabpanel"` region via manual slot
  assignment (`slotAssignment: 'manual'` + `slot.assign()`, children
  tracked with a `MutationObserver`), leaving the consumer's DOM untouched.
  Attributes on the consumer's own slotted element (the dropdown trigger's
  `aria-haspopup`/`aria-expanded`) are set on `slotchange`.

### Form elements

`<cyber-input>`, `<cyber-textarea>`, `<cyber-checkbox>`, `<cyber-switch>`,
`<cyber-radio-group>`, `<cyber-slider>` and `<cyber-select>` are
form-associated custom elements (`static formAssociated = true` +
`ElementInternals`), built on `internal/form-control.ts`:

- **Wrap a native control, mirror it.** Every element except the select
  renders a real `<input>` / `<textarea>` in its shadow root, styled by the
  existing class skin. Keyboard, IME, autofill, `indeterminate`, constraint
  validation and the browser's localized messages come from the platform.
  `FormControl` mirrors the control's value (`setFormValue`) and validity
  (`setValidity`, copying the native flags and message, anchored on the
  control) to `ElementInternals`. The inner controls can't join the outer
  form: they live in another tree, so only the host is submitted.
- **Native value semantics.** The `value` / `checked` attribute is the default
  (`defaultValue` / `defaultChecked`), the property is the live value, and a
  property write detaches it ("dirty"). Form reset (`formResetCallback`)
  returns to the default, and `formStateRestoreCallback` restores the
  `setFormValue` state. Setters and reset push to the inner control and call
  `commit()` **synchronously**, so `FormData` and `validity` are current
  right after `el.value = …`, like a native control. `updated()` commits too.
- **Disabled.** Effective disabled is the `disabled` attribute OR an ancestor
  `<fieldset disabled>` (`formDisabledCallback`); the platform then bars the
  host from submission and validation.
- **States.** `:state(invalid)` follows validity, and `:state(user-invalid)`
  turns on once the user has interacted: a committed change, a failed
  submit (the host's `invalid` event) or `reportValidity()`. Then the inner
  control also gets `aria-invalid="true"`, which the skins style. Toggles add
  `:state(checked)` (+ `indeterminate`), and the select adds `:state(open)`.
- **Events.** The inner `input` event is composed and leaves the shadow root
  by itself (retargeted to the host); `change` isn't composed, so
  `emitChange()` re-dispatches it from the host.
- **Labels and focus.** `delegatesFocus: true`. Field-style elements
  (`FieldControl.renderField`) render a `.cyber-field` with an internal
  `<label for="control">` (or `aria-labelledby` for non-labelable controls)
  plus help text (`aria-describedby`). A `<label for>` pointing at the host
  focuses it: the base focuses on any click aimed at the host itself,
  because Firefox forwards the label's click without focusing. Its text
  becomes the inner control's `aria-label` (`fallbackLabel`), since IDREFs
  can't reach into the shadow root. Toggles forward a host click to the
  native checkbox. `<cyber-input>` implements implicit submission (Enter →
  default button / `requestSubmit()`), because the inner input has no form
  owner.
- **Radio group.** All native radios render in the group's one shadow root,
  so grouping, Tab stop and arrow keys are the browser's. Each
  `<cyber-radio>` is assigned (manual slotting, as in tabs) into its
  radio's `<label>`. Manual assignment applies to every slot in that root,
  so the group also assigns `label` / `help-text` slot content by hand.
- **Select.** The native popup can't be styled, so `<cyber-select>` is a
  custom WAI-ARIA select-only combobox: a `role="combobox"` trigger
  (`.cyber-select` skin) controls a `role="listbox"` popup (`.cyber-menu`) of
  light-DOM `<cyber-option role="option">`s, with real focus moved onto the
  options. Dismissal is `DismissController`, typeahead the shared
  `Typeahead` (also used by the dropdown). `valueMissing` uses the
  browser's own message, read from a detached `<select required>` probe.
- **Slider.** `sanitizeRange()` reproduces the native range's value
  sanitization (clamp, snap to step with ties up, midpoint default), so
  `value` reports what the browser shows.

## Build & scripts

| Script                   | What it does                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `npm run build`          | `vite build` (JS entries + CSS) → `tsc --emitDeclarationOnly` (`.d.ts`) → `cem analyze` (manifest) |
| `npm run typecheck`      | `tsc --noEmit -p tsconfig.test.json` (`src/`, `tests/` except `tests/types/`, config files)        |
| `npm run typecheck:dist` | Type tests in `tests/types/` against the built package (needs `npm run build` first)               |
| `npm run test`           | Browser test suite: Vitest browser mode in headless Chromium, Firefox and WebKit                   |
| `npm run test:watch`     | Same suite, watch mode                                                                             |
| `npm run lint`           | ESLint: `@eslint/js` + `typescript-eslint` recommended, plus `eslint-plugin-lit` / `-wc` on `src/` |
| `npm run format`         | Prettier, write (`format:check` verifies; CHANGELOG.md and lockfiles are ignored)                  |
| `npm run size`           | size-limit budgets from `.size-limit.json` (brotli; reads `dist/`, so build first)                 |
| `npm run pack:smoke`     | `npm pack` the library into `smoke/cyber-ui.tgz` (what the smoke apps install)                     |

Lifecycle hooks: `prepack` runs the library build (so any `npm pack`/`npm
publish` ships a fresh `dist/`), `prepublishOnly` runs typecheck + tests as a
publish gate.

### Build output and package exports

`vite.config.ts` builds one ES module per element file plus the all-in-one
entry. `lit` and `lit/*` are **external** (lit stays a `dependency`, so the
consumer's bundler installs and dedupes one copy). Code shared between
elements lands in `dist/chunks/`.

| Export                                                                                     | File                                                                                                    |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `.`                                                                                        | `dist/cyber-ui.js` — all elements + `toast()`                                                           |
| `./accordion`, `./card`, `./dropdown`, `./modal`, `./tabs`, `./toast`                      | `dist/components/cyber-<name>.js` (+ `.d.ts`)                                                           |
| `./checkbox`, `./input`, `./radio-group`, `./select`, `./slider`, `./switch`, `./textarea` | `dist/components/cyber-<name>.js` (+ `.d.ts`)                                                           |
| `./styles.css`                                                                             | `dist/cyber-ui.css` — everything, layered                                                               |
| `./styles/*.css`                                                                           | `dist/styles/<file>.css` — `tokens`, `themes`, `base`, `effects` and every component skin, each layered |
| `./react`, `./vue`                                                                         | types only: `dist/types/react.d.ts`, `dist/types/vue.d.ts`                                              |
| `./custom-elements.json`                                                                   | `dist/custom-elements.json`                                                                             |

The component entries register their element when imported, so `sideEffects`
lists `./dist/components/*.js` alongside `./dist/cyber-ui.js` and CSS. Without
that entry a bundler drops a bare `import '@jgawlik/cyber-ui/modal'`. Elements
style themselves with tokens from `:root`, so à-la-carte consumers still import
`styles/tokens.css` (and `themes.css` for `data-cyber-theme`). Adding a
component means adding its subpath to `exports` by hand; the vite entry is
picked up automatically from `src/components/*.ts`.

### Custom elements manifest and integrations

`cem analyze` (config: `custom-elements-manifest.config.mjs`, Lit mode) runs
last in `npm run build` and writes into `dist/`:

- `custom-elements.json`: the package's `customElements` field, and the
  source for the API tables on cyberui.art. The form base classes in
  `internal/` are analyzed too, so their members are inherited into each
  element. Plugins in `scripts/cem-plugins.mjs` keep only `cyber-*` events
  and events documented with `@fires` (the analyzer would otherwise list
  the dropdown's `emit(name)` helper as an event called `name`), and
  rewrite module paths from `src/**/*.ts` to the shipped `dist/**/*.js`.
- `vscode.html-custom-data.json`: VS Code HTML completions (consumers add
  `node_modules/@jgawlik/cyber-ui/dist/vscode.html-custom-data.json` to their
  `html.customData` setting), via `custom-element-vs-code-integration`.
- `web-types.json`: JetBrains completions, picked up automatically through
  the package's `web-types` field, via
  `custom-element-jet-brains-integration`.
- `types/react.d.ts`: React 19 `JSX.IntrinsicElements` (properties,
  differently spelled attributes such as `no-light-dismiss`, and
  `oncyber-*` listeners — React 19 attaches `on` + the exact event name on
  custom elements).
- `types/vue.d.ts`: Vue `GlobalComponents` (properties and `onCyberClose`-style
  handlers, which is what `@cyber-close` compiles to).

Both framework typings take prop types from the element classes
(`Partial<Pick<CyberModal, 'open' | …>>`), so they can't drift from the
source, and import any package types an event detail mentions. Only
settable public properties become props: frameworks assign props as
properties, and assigning a getter-only one (`form`, `validity`, …) throws.
Members the analyzer should hide need `@internal` on their _declaration_:
a field assigned only in the constructor is picked up from that assignment
without its modifiers or tags. Consumers opt
in with `import type {} from '@jgawlik/cyber-ui/react'` (or `/vue`).
`tests/types/` holds `@ts-expect-error`-backed type tests for both typings
and for the per-component entries; they resolve the package through its own
`exports`, so they also catch a broken exports map.

## Tests

`tests/*.test.ts` run with Vitest **browser mode** in real headless
Chromium, Firefox and WebKit (Playwright provider, one `instances` entry
each) — the components depend on platform behavior (native
`<dialog>.showModal`, shadow-DOM slot assignment, focus management) that DOM
emulators don't implement faithfully and that differs between engines. Run a
single engine with `npx vitest run --project <chromium|firefox|webkit>`. One
file per component plus `helpers.ts` (fixture mount/cleanup, event capture,
cancelable synthetic keydown, `expectAccessible()`). First run locally needs
`npx playwright install chromium firefox webkit`. On macOS the Firefox
instance launches with `CFFIXED_USER_HOME` set to a fresh per-run temp dir:
macOS 27 protects the Firefox app-data folder Playwright's Firefox shares,
which otherwise makes it quit with "Could not find profile folder"
(microsoft/playwright#42768). Drop the workaround once Playwright fixes it.

Every test file includes an accessibility check: `expectAccessible(el)` runs
axe-core (dev dependency) over the element, shadow roots included, limited to
the WCAG 2.x A/AA rule tags and with `color-contrast` disabled (tests render
without a themed page background). Real key presses that must trigger
native activation (Enter/Space on a button) use `userEvent` from
`vitest/browser`; everything else uses the synthetic `keydown` helper.

Test files run **one at a time per browser** (`fileParallelism: false`):
`userEvent` sends real keys and clicks to whichever frame has focus, and
files running in parallel frames stole each other's focus (intermittent
failures). Keyboard tests assert **parity with native controls** where
engines differ: WebKit (Safari's default) skips checkboxes and radios on
Tab, and doesn't wrap radio arrow keys, so `tabReachesNative()` measures
what the engine does for a native control and the element must match.

Each form element's test file covers value (default, property, user
input, `FormData`, synchronous updates), validity (native constraints,
messages, `setCustomValidity`, `:state(user-invalid)`), form reset and
state restore, fieldset disabling, keyboard behavior, and axe.

When changing an element's behavior, extend its test file in the same change —
events, keyboard navigation, and open/close state transitions are the contract.

## Verification

- **Tests** (`npm run test`): behavioral contract of the interactive elements
  plus axe-core checks, in all three engines.
- **Dist type tests** (`npm run typecheck:dist`): generated React/Vue typings
  and per-component entry types, resolved through `exports`.
- **Size budgets** (`npm run size`): all elements with and without lit, a
  single element, and the global stylesheet. Budgets sit roughly 10–15%
  above the measured sizes; raise them deliberately, never to silence a
  regression such as lit getting bundled again.
- **Smoke apps** (`smoke/react`, `smoke/vue`): install `smoke/cyber-ui.tgz`
  (regenerate with `npm run pack:smoke`) to verify real-world install,
  custom-element events and framework config. React consumes à la carte
  (per-component entries + per-file `styles/*.css`), Vue the all-in-one
  package entry + `styles.css`, so both export styles stay covered. Locally,
  refresh an existing install with `npm install
@jgawlik/cyber-ui@file:../cyber-ui.tgz`: the (gitignored) smoke lockfile
  pins the tarball's integrity, so a plain `npm install` can silently keep
  the old contents from npm's cache.

## CI

- `.github/workflows/ci.yml`: on every push to `main` and every PR —
  lint, format check, typecheck, library build, dist type tests, size
  budgets, browser tests (installs Chromium, Firefox and WebKit;
  `release.yml` does the same for its gate), and a matrix job that packs the
  library and builds both smoke apps against the tarball (catches packaging
  regressions: exports map, `sideEffects`, missing files).

## Releasing

Releases are **controlled and tag-driven**: nothing is ever published from a
local machine. Pushing a `v*` tag triggers `.github/workflows/release.yml`,
which verifies the tag matches `package.json`, verifies `CHANGELOG.md` has a
section for the version, runs the full gates (typecheck + browser tests via
`prepublishOnly`, build via `prepack`), publishes to npm, and creates a GitHub
release.

Procedure for a release:

1. Promote the `Unreleased` notes in `CHANGELOG.md` to a new
   `## [<version>] - <date>` section and commit that.
2. `npm version patch|minor|major` — bumps `package.json`, commits, and
   creates the `v<version>` tag in one step (requires a clean tree).
3. `git push && git push --tags` — the tag push starts the release workflow.

One-time setup on npmjs.com (package `@jgawlik/cyber-ui` → Settings →
Trusted Publisher): register **GitHub Actions** with this repository and
workflow filename `release.yml`. That lets CI publish via OIDC — no npm token
stored in the repo, and local 2FA stays enforced for everything else.
(Fallback if trusted publishing isn't configured: add an npm _automation_
granular token as the `NODE_AUTH_TOKEN` secret and pass it to the publish
step.)

Released so far: `v0.1.0` (2026-10-07), the initial publish — done manually
before this pipeline existed; every later release goes through the workflow.
