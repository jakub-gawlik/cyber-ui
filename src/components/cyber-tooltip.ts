import { LitElement, html, css, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import {
  AnchorController,
  floatingStyles,
  type Placement,
} from './internal/anchor.js';
import { DismissController } from './internal/dismiss.js';
import tooltipStyles from '../styles/components/tooltip.css?inline';

export type TooltipTrigger = 'hover' | 'focus' | 'manual';

/**
 * <cyber-tooltip> — a bubble of short text next to the element it wraps.
 * Shows on hover and keyboard focus (after `delay` ms), hides when the
 * pointer / focus leaves, on Escape, or on a pointerdown anywhere.
 *
 * The bubble is an anchored panel: top-layer popover + CSS anchor
 * positioning where supported (so it never gets clipped by `overflow`),
 * else absolutely positioned and flipped by the element when out of room.
 * The bubble is a `role="tooltip"` live region: ARIA id references cannot
 * cross the shadow boundary, so the text is announced through
 * `aria-live` instead of `aria-describedby`.
 *
 * @slot - The trigger: the element the tooltip describes.
 * @slot content - Rich bubble content (instead of the `content` attribute).
 * @csspart anchor - The wrapper around the trigger.
 * @csspart bubble - The `role="tooltip"` bubble.
 * @fires {CustomEvent} cyber-open - The bubble appeared.
 * @fires {CustomEvent} cyber-close - The bubble disappeared.
 *
 * @example
 * <cyber-tooltip content="Jump drive offline" placement="bottom">
 *   <button class="cyber-btn">Jump</button>
 * </cyber-tooltip>
 */
@customElement('cyber-tooltip')
export class CyberTooltip extends LitElement {
  static styles = [
    unsafeCSS(tooltipStyles),
    floatingStyles,
    css`
      :host {
        display: inline-block;
        --cyber-floating-gap: 10px;
      }

      .cyber-tooltip__bubble {
        z-index: 60;
      }
    `,
  ];

  /** Bubble text (the `content` slot overrides it). */
  @property() content = '';

  /** Side of the trigger the bubble appears on (flips when out of room). */
  @property({ reflect: true }) placement: Placement = 'top';

  /**
   * Space-separated triggers: `hover`, `focus` (default both), or
   * `manual` to drive it with `open` / `show()` / `hide()` only.
   */
  @property() trigger = 'hover focus';

  /** Delay before showing, in ms (hiding is immediate). */
  @property({ type: Number }) delay = 150;

  /** Whether the bubble is shown. */
  @property({ type: Boolean, reflect: true }) open = false;

  @query('.cyber-tooltip__bubble') private bubble!: HTMLElement;
  @query('.cyber-anchor') private anchor!: HTMLElement;

  private timer = 0;

  constructor() {
    super();
    new DismissController(this, {
      isOpen: () => this.open,
      dismiss: () => this.hide(),
    });
    new AnchorController(this, {
      panel: () => this.bubble,
      anchor: () => this.anchor,
      placement: () => this.placement,
      isOpen: () => this.open,
    });
  }

  show() {
    window.clearTimeout(this.timer);
    this.open = true;
  }

  hide() {
    window.clearTimeout(this.timer);
    this.open = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('pointerenter', this.onPointerEnter);
    this.addEventListener('pointerleave', this.onPointerLeave);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearTimeout(this.timer);
    this.removeEventListener('pointerenter', this.onPointerEnter);
    this.removeEventListener('pointerleave', this.onPointerLeave);
    this.removeEventListener('focusin', this.onFocusIn);
    this.removeEventListener('focusout', this.onFocusOut);
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('open') && changed.get('open') !== undefined) {
      this.dispatchEvent(
        new CustomEvent(this.open ? 'cyber-open' : 'cyber-close', {
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  private has(trigger: TooltipTrigger): boolean {
    return this.trigger.split(/\s+/).includes(trigger);
  }

  private scheduleShow() {
    window.clearTimeout(this.timer);
    if (this.delay > 0) {
      this.timer = window.setTimeout(() => (this.open = true), this.delay);
    } else {
      this.open = true;
    }
  }

  private onPointerEnter = () => {
    if (this.has('hover')) this.scheduleShow();
  };

  private onPointerLeave = () => {
    if (this.has('hover')) this.hide();
  };

  private onFocusIn = () => {
    if (this.has('focus')) this.scheduleShow();
  };

  private onFocusOut = () => {
    if (this.has('focus')) this.hide();
  };

  render() {
    return html`
      <div class="cyber-anchor" part="anchor"><slot></slot></div>
      <div
        class="cyber-tooltip__bubble cyber-floating"
        part="bubble"
        role="tooltip"
        aria-live="polite"
        ?hidden=${!this.open}
      >
        <slot name="content">${this.content}</slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-tooltip': CyberTooltip;
  }
}
