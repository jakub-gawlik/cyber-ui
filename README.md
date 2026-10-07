# cyber-ui

Cyberpunk / Stellaris-flavored UI components that work in **any** web project — plain HTML, React, Vue, Svelte, anything. Hybrid architecture:

- **CSS core** — design tokens + classes (`.cyber-btn`, `.cyber-card`, `.cyber-panel`, inputs, progress bars, stat readouts, tooltips, effects). Zero JavaScript.
- **Lit web components** — `<cyber-card>`, `<cyber-modal>`, `<cyber-tabs>`, `<cyber-dropdown>`, `<cyber-accordion>`, `<cyber-toaster>` for slotted composition and interactive behavior with keyboard navigation and ARIA.

**[Documentation](docs/README.md)**

## Install

```sh
npm install cyber-ui
```

```js
import 'cyber-ui/styles.css'; // tokens + CSS-class components
import 'cyber-ui';            // registers <cyber-*> elements
```

Or CDN, no build step:

```html
<link rel="stylesheet" href="https://unpkg.com/cyber-ui/dist/cyber-ui.css" />
<script type="module" src="https://unpkg.com/cyber-ui/dist/cyber-ui.js"></script>
```

## Quick taste

Pure CSS (works without any JS):

```html
<button class="cyber-btn cyber-btn--primary">Engage</button>

<div class="cyber-progress cyber-progress--striped" style="--cyber-progress: 72%">
  <div class="cyber-progress__label"><span>Hull</span><span>72%</span></div>
  <div class="cyber-progress__track" role="progressbar" aria-valuenow="72"
       aria-valuemin="0" aria-valuemax="100">
    <div class="cyber-progress__bar"></div>
  </div>
</div>
```

Web components (same stylesheet, slotted):

```html
<cyber-modal id="alert">
  <span slot="title">Incoming Transmission</span>
  <p>Hostile fleet detected.</p>
  <button slot="footer" class="cyber-btn cyber-btn--primary">Engage</button>
</cyber-modal>
```

Toasts, imperatively:

```js
import { toast } from 'cyber-ui';
toast('Jump complete');
toast('Hull integrity critical', { title: 'Alert', variant: 'danger', duration: 8000 });
```

## Theming

Everything derives from `--cyber-*` custom properties, which inherit through shadow DOM — CSS classes and `<cyber-*>` elements retheme together. Apply a built-in theme with `data-cyber-theme` on `<html>` (whole app) or any container (just that subtree; themes nest, nearest ancestor wins):

```html
<html data-cyber-theme="phosphor">
```

| Theme | Palette |
| --- | --- |
| `netrunner` | cyan / pink (the default) |
| `crimson` | red alert / amber |
| `phosphor` | green monochrome terminal |
| `synthwave` | violet / pink retrowave |
| `ghost` | pale light-surface palette |

A custom theme is just base-token overrides under your own name — it can be one color or a full palette. See **[docs/theming.md](docs/theming.md)** for the token reference and recipes.

## Documentation

| | |
| --- | --- |
| [Getting started](docs/getting-started.md) | Install, imports, React/Vue notes, browser support |
| [Theming](docs/theming.md) | Tokens, built-in themes, composing your own |
| [CSS components](docs/css-components.md) | Every `.cyber-*` class with markup examples |
| [Web components](docs/web-components.md) | Every `<cyber-*>` element: attributes, slots, events, `toast()` |
| [Effects](docs/effects.md) | `.cyber-fx-*` classes and the interaction model |
| [Architecture](docs/architecture.md) | Repo layout, dual-consumption CSS, build, CI |

## Development

```sh
npm run dev    # demo at localhost:5173 (demo/index.html)
npm run build  # dist/cyber-ui.js + dist/cyber-ui.css + types
```

`demo/standalone.html` smoke-tests the built output with no bundler: run a static server from the repo root after building. Framework integration smoke apps live in `smoke/react` and `smoke/vue`.

Architecture in one line: component styles are authored once in `src/styles/components/*.css` and consumed twice — bundled into the global `cyber-ui.css`, and imported (`?inline`) into the matching Lit element's shadow root — so the class version and the element version can't drift apart. Details in [docs/architecture.md](docs/architecture.md).

## License

MIT
