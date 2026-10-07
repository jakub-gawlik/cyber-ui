# Changelog

All notable changes to cyber-ui are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-07

Initial release.

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
