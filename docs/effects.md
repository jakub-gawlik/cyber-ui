# Effects & interaction model

Opt-in decorative classes from
[`src/styles/effects.css`](../src/styles/effects.css), composable with any
component or your own markup. **All motion respects `prefers-reduced-motion`.**

## Effect classes

| Class                 | Effect                      | Notes                                                                                     |
| --------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `.cyber-fx-scanlines` | CRT line overlay            | Overlay is an `::after`; the class sets `position: relative` on the element               |
| `.cyber-fx-glitch`    | RGB-split glitch text       | **Requires `data-text`** mirroring the element's text content                             |
| `.cyber-fx-flicker`   | CRT brightness flicker      | Animation only                                                                            |
| `.cyber-fx-holo`      | Holographic shimmer         | Animated gradient sheen over text                                                         |
| `.cyber-fx-grid`      | Perspective grid backdrop   | For sections / pages                                                                      |
| `.cyber-glass`        | Frosted translucent surface | `backdrop-filter`; composable (also works as `<cyber-card class="cyber-glass">`)          |
| `.cyber-glow`         | Outer glow halo wrapper     | Use around clipped elements (buttons) whose own `clip-path` cuts off outer shadows        |
| `.cyber-fx-reveal`    | Scroll-driven reveal        | `animation-timeline: view()` — pure CSS, no IntersectionObserver; progressive enhancement |

```html
<h1 class="cyber-heading cyber-fx-glitch" data-text="SYSTEM BREACH">
  SYSTEM BREACH
</h1>

<section class="cyber-panel cyber-fx-scanlines">…</section>

<span class="cyber-glow"
  ><button class="cyber-btn cyber-btn--primary">Engage</button></span
>
```

## Interaction model

The library serves different affordances to pointer and touch devices:

- **Hover flourishes** (card lift + media zoom, button light sweep, panel
  bracket stretch) are served only to real pointers via
  `@media (hover: hover) and (pointer: fine)` — touch devices never get sticky
  hover states.
- **Press feedback** uses `:active`, which fires on touch, plus
  `-webkit-tap-highlight-color` cleanup.
- **Scroll-driven reveal** (`.cyber-fx-reveal`) is the touch-device stand-in for
  hover delight: elements materialize as they scroll into view.

When adding a new hover effect, follow the same pattern: flourish inside the
`hover/pointer` media query, press feedback on `:active`, animation gated behind
`prefers-reduced-motion`.
