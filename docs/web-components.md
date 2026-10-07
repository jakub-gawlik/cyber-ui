# Web components

Importing `cyber-ui` registers every element. Each element imports its component
stylesheet (`?inline`) into its shadow root, shares tokens with the global
stylesheet, and exposes `part`s for deep styling
(`cyber-modal::part(dialog) { … }`).

All events are `CustomEvent`s with `bubbles: true, composed: true`.

| Element                                        | Events                                      | Source                                                                      |
| ---------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| `<cyber-card>`                                 | —                                           | [`src/components/cyber-card.ts`](../src/components/cyber-card.ts)           |
| `<cyber-modal>`                                | `cyber-close`                               | [`src/components/cyber-modal.ts`](../src/components/cyber-modal.ts)         |
| `<cyber-tabs>` + `<cyber-tab-panel>`           | `cyber-tab-change`                          | [`src/components/cyber-tabs.ts`](../src/components/cyber-tabs.ts)           |
| `<cyber-dropdown>`                             | `cyber-open`, `cyber-close`, `cyber-select` | [`src/components/cyber-dropdown.ts`](../src/components/cyber-dropdown.ts)   |
| `<cyber-accordion>` + `<cyber-accordion-item>` | `cyber-toggle`                              | [`src/components/cyber-accordion.ts`](../src/components/cyber-accordion.ts) |
| `<cyber-toaster>` + `toast()`                  | —                                           | [`src/components/cyber-toast.ts`](../src/components/cyber-toast.ts)         |

## `<cyber-card>`

Content card with media header, title + content body and a footer link row.
Empty slots collapse — their section is hidden entirely.

- **Slots:** `media` (image), `title`, default (content), `footer` (links)
- **Parts:** `card`, `media`, `body`, `title`, `content`, `footer`
- **Variant:** `<cyber-card class="cyber-glass">` gives the frosted glass
  surface

```html
<cyber-card>
  <img slot="media" src="nebula.jpg" alt="Nebula" />
  <span slot="title">Signal Lost</span>
  <p>Long-range sensors report an anomaly…</p>
  <a slot="footer" href="#">Details</a>
</cyber-card>
```

## `<cyber-modal>`

Modal dialog built on native `<dialog>` — top layer, focus trap and Escape
handling come from the platform.

- **Attributes/properties:** `open` (boolean, reflected — `<cyber-modal open>`
  works), `no-light-dismiss` (disables Escape / backdrop-click closing)
- **Methods:** `show()`, `close()`
- **Events:** `cyber-close` on any dismissal (Escape, backdrop, close button,
  `close()`)
- **Slots:** `title`, default (body), `footer` (actions; hidden when empty)
- **Parts:** `dialog`, `header`, `body`, `footer`, `close-button`

```html
<cyber-modal id="alert">
  <span slot="title">Incoming Transmission</span>
  <p>Hostile fleet detected.</p>
  <button slot="footer" class="cyber-btn cyber-btn--primary">Engage</button>
</cyber-modal>
<script>
  document.getElementById("alert").show();
</script>
```

## `<cyber-tabs>` / `<cyber-tab-panel>`

Tab strip with roving-tabindex keyboard navigation (ArrowLeft/Right, Home, End).
Renders one tab button per slotted panel; the panel's `label` attribute becomes
the button text.

- **`<cyber-tabs>` attributes:** `selected` (number, reflected — index of the
  active tab)
- **Events:** `cyber-tab-change` with `detail: { index, label }` (user-initiated
  changes only)
- **Parts:** `list`, `tab`, `panels`
- **`<cyber-tab-panel>`:** `label` attribute; gets `role="tabpanel"` and is
  focusable

```html
<cyber-tabs selected="1">
  <cyber-tab-panel label="Overview">…</cyber-tab-panel>
  <cyber-tab-panel label="Fleet">…</cyber-tab-panel>
</cyber-tabs>
```

## `<cyber-dropdown>`

Trigger + anchored menu. Closes on Escape, outside click, or item selection;
arrow keys / Home / End move focus; Tab closes. Flips above the trigger when
there's no room below.

- **Attributes:** `open` (boolean, reflected)
- **Methods:** `show()`, `hide()`
- **Events:** `cyber-open`, `cyber-close`, `cyber-select` with
  `detail: { item }`
- **Slots:** `trigger` (a button), default — menu items, each with
  `role="menuitem"` (skinned automatically; `aria-disabled="true"` removes an
  item from keyboard order)
- **Parts:** `menu`

```html
<cyber-dropdown>
  <button slot="trigger" class="cyber-btn">Actions</button>
  <button role="menuitem">Scan system</button>
  <button role="menuitem">Open starmap</button>
</cyber-dropdown>
```

## `<cyber-accordion>` / `<cyber-accordion-item>`

Stacked expandable sections.

- **`<cyber-accordion>` attributes:** `single` — opening one item closes the
  others
- **`<cyber-accordion-item>` attributes:** `heading` (trigger label), `open`
  (boolean, reflected)
- **Methods (item):** `toggle()`
- **Events (item):** `cyber-toggle` with `detail: { open }`
- **Slots (item):** `header` (alternative to `heading`), default (content)
- **Parts (item):** `trigger`, `content`

```html
<cyber-accordion single>
  <cyber-accordion-item heading="Propulsion" open>…</cyber-accordion-item>
  <cyber-accordion-item heading="Weapons">…</cyber-accordion-item>
</cyber-accordion>
```

## `<cyber-toaster>` / `toast()`

Fixed toast stack plus an imperative API.

```js
import { toast } from "cyber-ui";
toast("Jump complete");
toast("Hull integrity critical", {
  title: "Alert",
  variant: "danger",
  duration: 8000,
});
```

`toast()` creates a `<cyber-toaster>` in `<body>` on first use, or reuses one
you placed yourself — place your own to control where the stack lives:

```html
<cyber-toaster position="bottom-right"></cyber-toaster>
```

- **Positions:** `top-right` (default), `top-left`, `bottom-right`,
  `bottom-left`
- **`ToastOptions`:** `message`, `title?`, `variant?`
  (`'info' | 'success' | 'warning' | 'danger'`), `duration?` (ms; default 5000;
  `0` keeps the toast until closed)
- **Toaster methods:** `show(options | string): number` (returns the toast id),
  `dismiss(id)`
- Auto-dismiss **pauses on hover** and resumes on leave; toasts render with
  `role="status"`
