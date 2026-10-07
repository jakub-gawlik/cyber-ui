# CSS components

The zero-JS half of the library. Every class below ships in
`cyber-ui/styles.css`; each component is authored in its own file under
[`src/styles/components/`](../src/styles/components/). Naming is BEM-ish: block
(`.cyber-btn`), element (`.cyber-card__title`), modifier
(`.cyber-btn--primary`).

Several blocks (card, modal, toast, tabs, accordion, menu) double as the
internal skin of a `<cyber-*>` element — see
[Architecture](architecture.md#one-stylesheet-two-consumers).

## Base helpers (`base.css`)

No global resets; everything is opt-in.

| Class                              | Use                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `.cyber-screen`                    | Page backdrop: bg, text color, body font. Put on `<body>` or a container |
| `.cyber-heading`                   | Display-font uppercase heading with glow                                 |
| `.cyber-label`                     | Small mono uppercase label                                               |
| `.cyber-text` / `.cyber-text--dim` | Body text / secondary text                                               |
| `.cyber-terminal`                  | Mono primary-colored terminal readout text                               |

## Button — `.cyber-btn`

Angular clipped button. Variants: `--primary` (filled), `--danger`; default is
the ghost/outline look. Sizes: `--sm`, `--lg`.

```html
<button class="cyber-btn cyber-btn--primary">Engage</button>
<button class="cyber-btn cyber-btn--danger cyber-btn--sm">Purge</button>
```

`clip-path` removes outer box-shadows, so button glow is inset + text glow. For
an outer halo, wrap the button in `.cyber-glow`.

## Link — `.cyber-link`

Uppercase mono link with animated underline and hover glow. `--accent` recolors
to the accent token. Used standalone and in card/panel footers.

## Badge — `.cyber-badge`

Status chip with a glowing dot. Variants: `--accent`, `--warning`, `--danger`,
`--solid`.

```html
<span class="cyber-badge cyber-badge--warning">Shields low</span>
```

## Card — `.cyber-card`

```html
<article class="cyber-card">
  <figure class="cyber-card__media"><img src="nebula.jpg" alt="" /></figure>
  <div class="cyber-card__body">
    <h3 class="cyber-card__title">Signal Lost</h3>
    <p class="cyber-card__content">Long-range sensors report an anomaly…</p>
  </div>
  <footer class="cyber-card__footer">
    <a class="cyber-link" href="#">Details</a>
  </footer>
</article>
```

Hover lift + media zoom are served only to real pointers (see
[Effects → interaction model](effects.md#interaction-model)).

## Panel — `.cyber-panel`

Framed container with corner brackets and a header bar — the Stellaris-style
"window". Brackets are pseudo-elements and stretch on hover (fine pointers
only).

```html
<section class="cyber-panel">
  <header class="cyber-panel__header">Fleet Command</header>
  <div class="cyber-panel__body">…</div>
</section>
```

## Form controls

All of these style **native elements**, so framework bindings, form submission
and validation work untouched.

| Class             | Element                                                 | Notes                                        |
| ----------------- | ------------------------------------------------------- | -------------------------------------------- |
| `.cyber-input`    | `<input>`, `<textarea>`                                 | Mono text input with accent caret            |
| `.cyber-select`   | `<select>`                                              | Custom gradient-drawn chevron                |
| `.cyber-checkbox` | `<label>` wrapping `<input type="checkbox">` + `<span>` | Visually replaced box; native keyboard/focus |
| `.cyber-radio`    | `<label>` wrapping `<input type="radio">` + `<span>`    | Targeting-diamond style                      |
| `.cyber-field`    | wrapper `<div>`                                         | Label + input stack                          |

```html
<div class="cyber-field">
  <label for="callsign">Callsign</label>
  <input id="callsign" class="cyber-input" placeholder="V-7" />
</div>

<label class="cyber-checkbox"
  ><input type="checkbox" /> <span>Enable shields</span></label
>
<label class="cyber-radio"
  ><input type="radio" name="x" /> <span>Alpha</span></label
>
```

## Divider — `.cyber-divider`

Gradient hairline, optionally labeled:

```html
<hr class="cyber-divider" />
<div class="cyber-divider" role="separator">SECTION</div>
```

## Progress — `.cyber-progress`

Resource / progress bar. Pure CSS: the fill width comes from the
`--cyber-progress` custom property, so frameworks just bind a style.

```html
<div class="cyber-progress" style="--cyber-progress: 72%">
  <div class="cyber-progress__label"><span>Hull</span><span>72%</span></div>
  <div
    class="cyber-progress__track"
    role="progressbar"
    aria-valuenow="72"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div class="cyber-progress__bar"></div>
  </div>
</div>
```

Variants: `--striped` (animated), `--segmented`, and colors `--accent`,
`--warning`, `--danger`, `--success`. Segment count: `--cyber-progress-segments`
(default 8).

## Stat — `.cyber-stat`

Stat readout: label, big value, optional delta. Group several in a flex row;
each stat carries its own left accent rule.

```html
<div class="cyber-stat">
  <span class="cyber-stat__label">Energy Credits</span>
  <span class="cyber-stat__value">12,480</span>
  <span class="cyber-stat__delta cyber-stat__delta--up">+340</span>
</div>
```

Delta direction: `--up` (success color), `--down` (danger color).

## Tooltip — `.cyber-tooltip`

Pure-CSS tooltip from a data attribute. Shows on hover **and keyboard focus**.

```html
<span class="cyber-tooltip" data-tooltip="Jump drive offline">
  <button class="cyber-btn">Jump</button>
</span>
```

Put the class on a **wrapper** when the trigger is corner-clipped (buttons,
badges) — `clip-path` would cut the tooltip off the trigger itself. Position
variants: `--bottom`, `--left`, `--right` (default: top). `data-tooltip`
supports line breaks (`white-space: pre-line`).

## Menu — `.cyber-menu`

The dropdown menu surface, usable standalone: `.cyber-menu` container,
`.cyber-menu__item` entries, `.cyber-menu__separator`. `<cyber-dropdown>` uses
it internally and adds behavior.

## Toast — `.cyber-toast`

Notification card, usable standalone for static alert banners: `__body`,
`__title`, `__message`, `__close`. Variants: `--success`, `--warning`,
`--danger` (default: info/primary). Live stacking and timers come from
[`<cyber-toaster>` / `toast()`](web-components.md#cyber-toaster--toast).

## Modal — `.cyber-modal`

Dialog frame (`__header`, `__body`, `__footer`, `__close`), usable directly on a
native element:

```html
<dialog class="cyber-modal">…</dialog>
```

`<cyber-modal>` wraps this with open/close plumbing and slots.

## Tabs & accordion classes

`.cyber-tabs__list` / `.cyber-tab` / `.cyber-tabs__panels` and
`.cyber-accordion` / `__trigger` / `__region` / `__content` are usable
class-only — you wire the behavior (e.g. your router drives `aria-selected` /
`aria-expanded`). The `<cyber-tabs>` and `<cyber-accordion>` elements provide
that behavior for you.
