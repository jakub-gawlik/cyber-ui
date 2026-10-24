import { css, type ReactiveController, type ReactiveControllerHost } from 'lit';

/** Where a floating panel sits relative to its anchor. */
export type Placement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

export const PLACEMENTS: readonly Placement[] = [
  'top',
  'top-start',
  'top-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
  'right',
  'right-start',
  'right-end',
];

export interface AnchorOptions {
  /** The floating panel (a shadow node, rendered after the anchor). */
  panel: () => HTMLElement | null;
  /** The `.cyber-anchor` wrapper around the trigger. */
  anchor: () => HTMLElement | null;
  placement: () => Placement;
  isOpen: () => boolean;
}

type AnchoringMode = 'auto' | 'legacy';
type Side = 'top' | 'bottom' | 'left' | 'right';

const OPPOSITE: Record<Side, Side> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

let mode: AnchoringMode = 'auto';

/**
 * Force the legacy (absolute + JS flip) path, so tests can exercise both
 * paths in an engine that supports the modern one.
 * @internal
 */
export function setAnchoringMode(next: AnchoringMode) {
  mode = next;
}

/**
 * Modern path: the Popover API (top layer, so the panel escapes
 * `overflow: hidden` and stacking contexts) plus CSS anchor positioning
 * (`position-area` + `position-try-fallbacks` flip the panel when it
 * would overflow). Both are needed: a top-layer popover without anchor
 * positioning would need JS repositioning on every scroll.
 */
const modernSupported =
  typeof HTMLElement !== 'undefined' &&
  'showPopover' in HTMLElement.prototype &&
  typeof CSS !== 'undefined' &&
  CSS.supports('position-area: top') &&
  CSS.supports('anchor-name: --a') &&
  CSS.supports('position-try-fallbacks: flip-block');

/** Whether anchored panels use the Popover API + CSS anchor positioning. */
export function usesAnchoredPopovers(): boolean {
  return mode === 'auto' && modernSupported;
}

/**
 * Positions a floating panel next to its anchor. Modern engines get the
 * Popover API + CSS anchor positioning (see `usesAnchoredPopovers`); the
 * legacy path keeps the panel absolutely positioned inside the host and
 * flips it to the opposite side when it would overflow the viewport.
 *
 * The host renders the trigger inside a `.cyber-anchor` wrapper and the
 * panel with class `cyber-floating` *after* it (a CSS anchor must precede
 * the element it positions); `floatingStyles` supplies the positioning
 * rules for both paths, keyed on `data-placement`. The host toggles the
 * panel's `hidden` attribute; this controller takes care of the rest on
 * every host update.
 */
export class AnchorController implements ReactiveController {
  constructor(
    host: ReactiveControllerHost,
    private options: AnchorOptions,
  ) {
    host.addController(this);
  }

  hostUpdated() {
    const panel = this.options.panel();
    if (!panel) return;
    const placement = this.options.placement();
    const open = this.options.isOpen();
    if (usesAnchoredPopovers()) {
      if (!panel.hasAttribute('popover'))
        panel.setAttribute('popover', 'manual');
      panel.dataset.placement = placement;
      // the host toggles `hidden` in the same render, so an open panel is
      // displayable here; popovers that can't show (disconnected) throw
      try {
        if (open && !panel.matches(':popover-open')) panel.showPopover();
        else if (!open && panel.matches(':popover-open')) panel.hidePopover();
      } catch {
        // ignore
      }
    } else {
      if (panel.hasAttribute('popover')) panel.removeAttribute('popover');
      panel.dataset.placement = placement;
      if (open) this.flipIfNeeded(panel, placement);
    }
  }

  hostDisconnected() {
    const panel = this.options.panel();
    if (panel?.matches(':popover-open')) panel.hidePopover();
  }

  /** Legacy path: move to the opposite side when the panel overflows the
      viewport and the other side has more room. */
  private flipIfNeeded(panel: HTMLElement, placement: Placement) {
    const anchor = this.options.anchor();
    if (!anchor) return;
    const [side, align] = placement.split('-') as [Side, string | undefined];
    const panelRect = panel.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const room = {
      top: anchorRect.top,
      bottom: window.innerHeight - anchorRect.bottom,
      left: anchorRect.left,
      right: window.innerWidth - anchorRect.right,
    };
    const opposite = OPPOSITE[side];
    const size =
      side === 'top' || side === 'bottom' ? panelRect.height : panelRect.width;
    const overflows =
      (side === 'bottom' && panelRect.bottom > window.innerHeight) ||
      (side === 'top' && panelRect.top < 0) ||
      (side === 'right' && panelRect.right > window.innerWidth) ||
      (side === 'left' && panelRect.left < 0);
    if (overflows && room[opposite] >= size) {
      panel.dataset.placement = align ? `${opposite}-${align}` : opposite;
    }
  }
}

/**
 * Positioning rules for an anchored panel. Include in the host's static
 * styles; the modern rules only apply once the controller has put the
 * `popover` attribute on the panel, so they are inert in the legacy path.
 * `--cyber-floating-gap` is the distance between anchor and panel.
 */
export const floatingStyles = css`
  :host {
    position: relative;
  }

  .cyber-anchor {
    display: block;
    anchor-name: --cyber-anchor;
  }

  .cyber-floating[hidden] {
    display: none;
  }

  /* -- legacy: absolute inside the host, JS flips data-placement -------- */
  .cyber-floating:not([popover]) {
    position: absolute;
    z-index: 50;
  }

  .cyber-floating:not([popover])[data-placement^='bottom'] {
    top: calc(100% + var(--cyber-floating-gap, 6px));
  }

  .cyber-floating:not([popover])[data-placement^='top'] {
    bottom: calc(100% + var(--cyber-floating-gap, 6px));
  }

  .cyber-floating:not([popover])[data-placement='top'],
  .cyber-floating:not([popover])[data-placement='bottom'] {
    left: 50%;
    translate: -50% 0;
  }

  .cyber-floating:not([popover])[data-placement='top-start'],
  .cyber-floating:not([popover])[data-placement='bottom-start'] {
    left: 0;
  }

  .cyber-floating:not([popover])[data-placement='top-end'],
  .cyber-floating:not([popover])[data-placement='bottom-end'] {
    right: 0;
  }

  .cyber-floating:not([popover])[data-placement^='right'] {
    left: calc(100% + var(--cyber-floating-gap, 6px));
  }

  .cyber-floating:not([popover])[data-placement^='left'] {
    right: calc(100% + var(--cyber-floating-gap, 6px));
  }

  .cyber-floating:not([popover])[data-placement='left'],
  .cyber-floating:not([popover])[data-placement='right'] {
    top: 50%;
    translate: 0 -50%;
  }

  .cyber-floating:not([popover])[data-placement='left-start'],
  .cyber-floating:not([popover])[data-placement='right-start'] {
    top: 0;
  }

  .cyber-floating:not([popover])[data-placement='left-end'],
  .cyber-floating:not([popover])[data-placement='right-end'] {
    bottom: 0;
  }

  /* -- modern: top-layer popover anchored by CSS --------------------------
     :where() keeps the UA popover reset at zero specificity, so the
     component skin (.cyber-menu, …) wins regardless of order. */
  :where(.cyber-floating[popover]) {
    inset: auto;
    margin: 0;
    padding: 0;
    border: 0;
    overflow: visible;
    color: inherit;
    background: transparent;
  }

  .cyber-floating[popover] {
    position: fixed;
    position-anchor: --cyber-anchor;
    position-try-fallbacks:
      flip-block,
      flip-inline,
      flip-block flip-inline;
    position-visibility: anchors-visible;
  }

  .cyber-floating[popover][data-placement^='bottom'] {
    margin-block: var(--cyber-floating-gap, 6px) 0;
  }

  .cyber-floating[popover][data-placement^='top'] {
    margin-block: 0 var(--cyber-floating-gap, 6px);
  }

  .cyber-floating[popover][data-placement^='right'] {
    margin-inline: var(--cyber-floating-gap, 6px) 0;
  }

  .cyber-floating[popover][data-placement^='left'] {
    margin-inline: 0 var(--cyber-floating-gap, 6px);
  }

  .cyber-floating[popover][data-placement='top'] {
    position-area: top;
  }

  .cyber-floating[popover][data-placement='top-start'] {
    position-area: top span-right;
  }

  .cyber-floating[popover][data-placement='top-end'] {
    position-area: top span-left;
  }

  .cyber-floating[popover][data-placement='bottom'] {
    position-area: bottom;
  }

  .cyber-floating[popover][data-placement='bottom-start'] {
    position-area: bottom span-right;
  }

  .cyber-floating[popover][data-placement='bottom-end'] {
    position-area: bottom span-left;
  }

  .cyber-floating[popover][data-placement='left'] {
    position-area: left;
  }

  .cyber-floating[popover][data-placement='left-start'] {
    position-area: left span-bottom;
  }

  .cyber-floating[popover][data-placement='left-end'] {
    position-area: left span-top;
  }

  .cyber-floating[popover][data-placement='right'] {
    position-area: right;
  }

  .cyber-floating[popover][data-placement='right-start'] {
    position-area: right span-bottom;
  }

  .cyber-floating[popover][data-placement='right-end'] {
    position-area: right span-top;
  }
`;
