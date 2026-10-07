# Theming

Everything derives from `--cyber-*` custom properties defined in
[`src/styles/tokens.css`](../src/styles/tokens.css). Custom properties inherit
through shadow DOM, so CSS classes and `<cyber-*>` elements retheme together —
override tokens on `:root`, a container, or a single element.

## Base tokens

These are the themeable surface — a theme is just a set of overrides for them.

| Token                     | Default              | Role                                           |
| ------------------------- | -------------------- | ---------------------------------------------- |
| `--cyber-bg`              | `#05080f`            | Page / scrim base                              |
| `--cyber-surface`         | `#0a1220`            | Opaque component surface (modal, menu, toast)  |
| `--cyber-surface-glass`   | `rgba(10,20,34,.82)` | Translucent surface (card, panel, accordion)   |
| `--cyber-primary`         | `#00e5ff`            | Main accent: borders, glows, interactive color |
| `--cyber-accent`          | `#ff2a6d`            | Secondary accent                               |
| `--cyber-warning`         | `#ffc857`            | Warning state                                  |
| `--cyber-danger`          | `#ff4d5e`            | Danger state                                   |
| `--cyber-success`         | `#3dffa0`            | Success state                                  |
| `--cyber-text`            | `#d7edf5`            | Body text                                      |
| `--cyber-text-dim`        | `#7e98a8`            | Secondary text, labels                         |
| `--cyber-text-on-primary` | `#041019`            | Text on filled-primary surfaces                |
| `--cyber-highlight`       | `#ffffff`            | Neutral mixer: sheens, stripes                 |
| `--cyber-shade`           | `#000000`            | Neutral mixer: scanlines, shadow overlays      |

The neutral mixers matter for light palettes — retint them when pure white/black
reads wrong (the built-in `ghost` theme softens `--cyber-shade`).

## Derived tokens

Computed from the base colors with `color-mix()`; you normally never set these:

| Token                                  | Derivation                      |
| -------------------------------------- | ------------------------------- |
| `--cyber-border`                       | primary 50%                     |
| `--cyber-border-dim`                   | primary 20%                     |
| `--cyber-tint`                         | primary 8%                      |
| `--cyber-glow-color`                   | primary 55%                     |
| `--cyber-glow` / `--cyber-glow-strong` | box-shadows built on glow-color |
| `--cyber-scrim`                        | bg 72% (modal backdrop)         |

**Why they're declared on both `:root` and `[data-cyber-theme]`:** CSS resolves
`var()` inside a custom property where the property is _defined_, not where it's
used. Declaring the derived set on every `data-cyber-theme` scope makes a scoped
theme re-derive borders/glows from its own colors instead of inheriting stale
`:root` values. Component color variants (`.cyber-btn--danger`, …) re-declare
the derived tokens they consume for the same reason. Keep this pattern when
adding tokens or variants.

## Non-color knobs

| Token                  | Default                  | Role                                       |
| ---------------------- | ------------------------ | ------------------------------------------ |
| `--cyber-clip`         | `12px`                   | Corner-cut size for the angular frame look |
| `--cyber-border-width` | `1px`                    | Border weight everywhere                   |
| `--cyber-font-display` | Orbitron → system        | Headings, stat values, buttons             |
| `--cyber-font-body`    | Rajdhani → system        | Body text                                  |
| `--cyber-font-mono`    | Share Tech Mono → mono   | Labels, links, menus, terminal             |
| `--cyber-space-1…4`    | `0.25 / 0.5 / 1 / 2 rem` | Spacing scale                              |

## Built-in themes

Apply with `data-cyber-theme` — on `<html>` for the whole app, or on any
container to theme just that subtree. Themes nest; the nearest ancestor wins.

```html
<html data-cyber-theme="phosphor">
  <!-- whole app -->
  <section data-cyber-theme="crimson">…</section>
  <!-- one section -->
</html>
```

| Theme       | Palette                                                                |
| ----------- | ---------------------------------------------------------------------- |
| `netrunner` | cyan / pink — the default; exists as a name so you can nest back to it |
| `crimson`   | red alert / amber                                                      |
| `phosphor`  | green monochrome terminal                                              |
| `synthwave` | violet / pink retrowave                                                |
| `ghost`     | pale light-surface palette (demonstrates the neutral mixers)           |

Full definitions: [`src/styles/themes.css`](../src/styles/themes.css). The
`netrunner` block mirrors the `:root` defaults in `tokens.css` — **keep the two
in sync** when changing defaults.

## Composing your own theme

A theme is base-token overrides under a name you pick. Anything you skip falls
through to the surrounding theme, so a theme can be one color or the full set:

```css
[data-cyber-theme="aftermarket"] {
  --cyber-bg: #0b0f0a;
  --cyber-primary: #f7f01d;
  --cyber-accent: #7df9ff;
  --cyber-text: #e8f0d8;
}
```

```html
<body data-cyber-theme="aftermarket"></body>
```

Because derived tokens recompute on any `data-cyber-theme` scope, borders,
tints, glows and the scrim follow your colors automatically.

## One-off tweaks

Tokens can be overridden on any element without defining a theme:

```html
<cyber-card style="--cyber-primary: #ffc857">…</cyber-card>
```

Caveat: an inline _base_-color override outside a `data-cyber-theme` scope does
**not** re-derive `--cyber-border` & co. (they were resolved where defined).
Either set the derived tokens too, or give the element a `data-cyber-theme`
attribute and put the overrides in CSS.
