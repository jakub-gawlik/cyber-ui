import {
  LitElement,
  html,
  css,
  nothing,
  unsafeCSS,
  type PropertyValues,
} from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import {
  AnchorController,
  floatingStyles,
  type Placement,
} from './internal/anchor.js';
import { DismissController } from './internal/dismiss.js';
import { slotHasContent } from './internal/slots.js';
import popoverStyles from '../styles/components/popover.css?inline';

/**
 * <cyber-popover> — trigger + anchored panel for rich content (forms,
 * details, confirmations). The trigger click toggles it; it closes on
 * Escape (focus returns to the trigger), on a pointerdown outside, or when
 * focus moves out of it. Opening moves focus into the panel.
 *
 * The panel is an anchored panel like the dropdown's menu: top-layer
 * popover + CSS anchor positioning where supported, else absolutely
 * positioned and flipped by the element when out of room. Escape is
 * scoped like the dropdown's (one overlay per key press).
 *
 * @slot trigger - The button that toggles the panel. It receives
 *   `aria-haspopup="dialog"` and a live `aria-expanded`.
 * @slot title - Optional heading bar.
 * @slot - Panel content.
 * @csspart anchor - The wrapper around the trigger.
 * @csspart panel - The `role="dialog"` surface.
 * @csspart title - The heading bar.
 * @csspart body - The content wrapper.
 * @fires {CustomEvent} cyber-open - The panel opened.
 * @fires {CustomEvent} cyber-close - The panel closed.
 *
 * @example
 * <cyber-popover label="Filters" placement="bottom-end">
 *   <button slot="trigger" class="cyber-btn">Filters</button>
 *   <span slot="title">Filters</span>
 *   <label><input type="checkbox"> Hostile only</label>
 * </cyber-popover>
 */
@customElement('cyber-popover')
export class CyberPopover extends LitElement {
  static styles = [
    unsafeCSS(popoverStyles),
    floatingStyles,
    css`
      :host {
        display: inline-block;
      }

      .cyber-popover__title[hidden] {
        display: none;
      }
    `,
  ];

  /** Whether the panel is open. */
  @property({ type: Boolean, reflect: true }) open = false;

  /** Side of the trigger the panel opens on (flips when out of room). */
  @property({ reflect: true }) placement: Placement = 'bottom';

  /** Accessible name of the panel (`aria-label` on the dialog). */
  @property() label = '';

  @state() private hasTitle = false;

  @query('.cyber-popover') private panel!: HTMLElement;
  @query('.cyber-anchor') private anchor!: HTMLElement;

  private trigger: HTMLElement | null = null;

  constructor() {
    super();
    new DismissController(this, {
      isOpen: () => this.open,
      dismiss: (reason) => this.hide(reason === 'escape'),
    });
    new AnchorController(this, {
      panel: () => this.panel,
      anchor: () => this.anchor,
      placement: () => this.placement,
      isOpen: () => this.open,
    });
  }

  show() {
    if (this.open) return;
    this.open = true;
    this.emit('cyber-open');
    this.updateComplete.then(() => this.panel.focus());
  }

  /** Close the panel; with `restoreFocus`, focus the trigger. */
  hide(restoreFocus = false) {
    if (!this.open) return;
    this.open = false;
    this.emit('cyber-close');
    if (restoreFocus) this.trigger?.focus();
  }

  toggle() {
    if (this.open) this.hide();
    else this.show();
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('focusout', this.onFocusOut);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('focusout', this.onFocusOut);
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('open')) this.syncTrigger();
  }

  private emit(name: string) {
    this.dispatchEvent(
      new CustomEvent(name, { bubbles: true, composed: true }),
    );
  }

  private syncTrigger() {
    this.trigger?.setAttribute('aria-haspopup', 'dialog');
    this.trigger?.setAttribute('aria-expanded', String(this.open));
  }

  private onTriggerSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const trigger =
      slot.assignedElements().find((el) => el instanceof HTMLElement) ?? null;
    if (trigger === this.trigger) return;
    this.trigger?.removeAttribute('aria-haspopup');
    this.trigger?.removeAttribute('aria-expanded');
    this.trigger = trigger as HTMLElement | null;
    this.syncTrigger();
  }

  private onTitleSlotChange(event: Event) {
    this.hasTitle = slotHasContent(event.target as HTMLSlotElement);
  }

  /** Close when focus leaves the element (Tab out); a click on
      non-focusable panel content moves focus nowhere, and stays open. */
  private onFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget;
    if (!this.open || !(next instanceof Node)) return;
    if (!this.contains(next) && !this.renderRoot.contains(next)) this.hide();
  };

  render() {
    return html`
      <div class="cyber-anchor" part="anchor">
        <slot
          name="trigger"
          @click=${this.toggle}
          @slotchange=${this.onTriggerSlotChange}
        ></slot>
      </div>
      <div
        class="cyber-popover cyber-floating"
        part="panel"
        role="dialog"
        tabindex="-1"
        aria-label=${this.label || nothing}
        aria-labelledby=${ifDefined(
          !this.label && this.hasTitle ? 'title' : undefined,
        )}
        ?hidden=${!this.open}
      >
        <div
          id="title"
          class="cyber-popover__title"
          part="title"
          ?hidden=${!this.hasTitle}
        >
          <slot name="title" @slotchange=${this.onTitleSlotChange}></slot>
        </div>
        <div class="cyber-popover__body" part="body"><slot></slot></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-popover': CyberPopover;
  }
}
