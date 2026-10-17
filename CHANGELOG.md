# Changelog

All notable changes to cyber-ui are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `<cyber-dropdown>`: typeahead — typing jumps to the next menu item whose
  text starts with the typed characters (repeat a character to cycle).
- `<cyber-tabs>`: `orientation="vertical"` (stacked tab strip, ArrowUp /
  ArrowDown navigation, `aria-orientation`) and `activation="manual"`
  (arrows move focus only; Enter / Space selects). New
  `.cyber-tabs--vertical` modifier in the CSS core.
- `toast()`: optional `action` button (`{ label, onClick }`, e.g. "Undo";
  clicking dismisses the toast), styled by the new `.cyber-toast__action`.
- `<cyber-toaster>`: `cyber-toast-dismiss` event with `{ id, reason }`
  (`timeout`, `close`, `action` or `api`); `dismiss(id, reason?)`.
- `<cyber-modal>`: `cyber-open` event; `returnValue` property,
  `close(returnValue?)`, and `cyber-close` detail `{ returnValue }`. A
  slotted `<form method="dialog">` (or a `formmethod="dialog"` button) now
  closes the modal with the submit button's value.
- Exported types `TabsOrientation`, `TabsActivation`, `ToastAction`,
  `ToastDismissReason`.

### Changed

- `<cyber-dropdown>`: `aria-haspopup="menu"` and a live `aria-expanded` are
  now set on the slotted trigger element (they were on the internal
  `<slot>`, where assistive tech ignores them). Escape and item selection
  return focus to the trigger.
- Escape dismissal is scoped: an open dropdown closes only when the Escape
  comes from inside it (or focus is inside it), or when it is the top-most
  open overlay; one Escape closes one layer. The handled event is
  `preventDefault()`ed and is no longer stopped from propagating, so other
  page Escape handlers keep working.
- `<cyber-tabs>`: tabs and panels are wired with generated ids,
  `aria-controls` and `aria-labelledby`. The `role="tabpanel"` region (with
  `tabindex="0"`) is now a shadow wrapper around each `<cyber-tab-panel>`,
  which no longer carries `role`, `tabindex` or `aria-label` itself. New
  `panel` and `base` parts. Out-of-range `selected` values are clamped;
  panels added or removed later are picked up, and label changes update
  the tab text.
- Toasts with `variant: 'danger'` or `'warning'` use `role="alert"`
  (assertive); others keep `role="status"`.

### Fixed

- JSDoc import examples now use the published package name
  `@jgawlik/cyber-ui`.

### Removed

- The in-repo demo site (`demo/`, `vite.demo.config.ts`) and the `dev`,
  `build:demo` and `preview` scripts — the library is now showcased and
  documented on a separate website.
- User-facing documentation (`docs/getting-started.md`, `theming.md`,
  `css-components.md`, `web-components.md`, `effects.md`, `docs/README.md`)
  and the README's usage sections — it now lives on https://cyberui.art.
  The repo keeps developer docs only (`docs/architecture.md`).

### Changed

- `package.json` `homepage` now points to https://cyberui.art.

## [0.1.0] - 2026-10-07

Initial release, published to npm as `@jgawlik/cyber-ui` (the unscoped name
`cyber-ui` is blocked by npm's similar-name rule against `cyber_ui`).

### Added

- **CSS core** (zero-JS): design tokens, base helpers (`.cyber-screen`,
  `.cyber-heading`, `.cyber-label`, `.cyber-text`, `.cyber-terminal`), and
  class components — button, link, badge, card, panel, input/field, select,
  checkbox, radio, divider, menu, progress bar (striped/segmented + color
  variants), stat readout, pure-CSS tooltip, toast skin, modal frame, tabs and
  accordion skins.
- **Lit web components**: `<cyber-card>`, `<cyber-modal>` (native `<dialog>`),
  `<cyber-tabs>`/`<cyber-tab-panel>`, `<cyber-dropdown>`,
  `<cyber-accordion>`/`<cyber-accordion-item>`, `<cyber-toaster>` plus the
  imperative `toast()` API.
- **Theming**: `--cyber-*` token system with derived tokens
  (`color-mix()`-based borders, tints, glows, scrim) that recompute per
  `data-cyber-theme` scope; built-in themes `netrunner`, `crimson`,
  `phosphor`, `synthwave`, `ghost`.
- **Effects**: `.cyber-fx-scanlines`, `.cyber-fx-glitch`, `.cyber-fx-flicker`,
  `.cyber-fx-holo`, `.cyber-fx-grid`, `.cyber-glass`, `.cyber-glow`,
  `.cyber-fx-reveal` — all motion gated behind `prefers-reduced-motion`.
- Documentation under `docs/`, demo site, React and Vue smoke apps, browser
  test suite (Vitest + Playwright) and CI.
