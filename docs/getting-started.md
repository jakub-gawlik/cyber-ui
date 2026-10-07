# Getting started

cyber-ui is a hybrid library:

- **CSS core** — design tokens + classes (`.cyber-btn`, `.cyber-card`,
  `.cyber-panel`, inputs, progress bars, stat readouts, tooltips, effects). Zero
  JavaScript; works in any stack, or no stack at all.
- **Lit web components** — `<cyber-card>`, `<cyber-modal>`, `<cyber-tabs>`,
  `<cyber-dropdown>`, `<cyber-accordion>`, `<cyber-toaster>` add slotted
  composition and interactive behavior (keyboard navigation, ARIA) on top of the
  same stylesheet.

You can use either half on its own. The CSS never requires the JS; the elements
import their own styles into shadow DOM, so they render correctly even without
the global stylesheet — but you'll normally load both so classes and elements
share one theme.

## Install

```sh
npm install @jgawlik/cyber-ui
```

```js
import "@jgawlik/cyber-ui/styles.css"; // tokens + CSS-class components (dist/cyber-ui.css)
import "@jgawlik/cyber-ui"; // registers every <cyber-*> element
```

Named imports give you the element classes, the imperative toast API, and types:

```ts
import { toast, CyberModal, type ToastOptions } from "@jgawlik/cyber-ui";
```

### CDN, no build step

```html
<link rel="stylesheet" href="https://unpkg.com/@jgawlik/cyber-ui/dist/cyber-ui.css" />
<script
  type="module"
  src="https://unpkg.com/@jgawlik/cyber-ui/dist/cyber-ui.js"
></script>
```

## First page

```html
<body class="cyber-screen">
  <button class="cyber-btn cyber-btn--primary">Engage</button>

  <cyber-card>
    <img slot="media" src="nebula.jpg" alt="" />
    <span slot="title">Signal Lost</span>
    <p>Long-range sensors report an anomaly…</p>
    <a slot="footer" href="#">Details</a>
  </cyber-card>
</body>
```

`.cyber-screen` is the opt-in page backdrop (background, text color, body font).
There are **no global resets** — nothing in the library styles bare elements, so
it is safe to drop into an existing project.

### Fonts

Webfonts are not bundled. Load your own and the token stack picks them up — the
demo uses [Orbitron](https://fonts.google.com/specimen/Orbitron) (display),
[Rajdhani](https://fonts.google.com/specimen/Rajdhani) (body) and
[Share Tech Mono](https://fonts.google.com/specimen/Share+Tech+Mono) (mono) — or
keep the system fallbacks. See
[Theming → non-color knobs](theming.md#non-color-knobs).

## Framework notes

Custom events are plain `CustomEvent`s (`cyber-close`, `cyber-tab-change`,
`cyber-select`, `cyber-open`, `cyber-toggle`) that bubble and cross shadow
boundaries (`composed: true`).

### React

React 19 supports custom elements and their events natively:

```jsx
<cyber-modal open={isOpen} oncyber-close={() => setOpen(false)}>
  …
</cyber-modal>
```

On React 18 and earlier, set complex props imperatively via a ref and add event
listeners with `addEventListener`. A working setup lives in
[`smoke/react/`](../smoke/react/).

### Vue

Mark `cyber-*` tags as custom elements so Vue doesn't try to resolve them as
components:

```js
// vite.config.js
vue({
  template: {
    compilerOptions: { isCustomElement: (tag) => tag.startsWith("cyber-") },
  },
});
```

Then events bind as usual: `@cyber-close="…"`, `@cyber-select="…"`. A working
setup lives in [`smoke/vue/`](../smoke/vue/).

### Form controls

Inputs, selects, checkboxes and radios are **styled native elements**
(`.cyber-input`, `.cyber-select`, `.cyber-checkbox`, `.cyber-radio`), so
`v-model`, controlled inputs, form submission and validation all work untouched.

## Browser support

Baseline is evergreen browsers. Notable platform features used:

- `color-mix()` — all derived tokens (borders, tints, glows). Chrome 111+,
  Firefox 113+, Safari 16.2+. Hard requirement; without it, derived colors fail.
- Native `<dialog>` (`showModal`) — `<cyber-modal>` top layer, focus trap,
  Escape.
- `backdrop-filter` — `.cyber-glass`; degrades to a translucent surface.
- `animation-timeline: view()` — `.cyber-fx-reveal` scroll-driven reveal; pure
  progressive enhancement, unsupported browsers just show the content.

All animation is gated behind `prefers-reduced-motion`.
