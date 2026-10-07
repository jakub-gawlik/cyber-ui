import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import accordionStyles from '../styles/components/accordion.css?inline';

/**
 * <cyber-accordion-item> — one expandable section. `heading` attribute or
 * `header` slot labels the trigger; default slot is the content.
 * Emits `cyber-toggle` with `{ open }`.
 */
@customElement('cyber-accordion-item')
export class CyberAccordionItem extends LitElement {
  static styles = [
    unsafeCSS(accordionStyles),
    css`
      :host {
        display: block;
      }

      :host(:not(:first-child)) {
        border-top: var(--cyber-border-width) solid var(--cyber-border-dim);
      }

      /* host carries the separator; neutralize the class rule's border */
      .cyber-accordion__trigger {
        border-top: 0;
      }
    `,
  ];

  /** Trigger label (alternative to the `header` slot). */
  @property() heading = '';

  /** Whether the section is expanded. */
  @property({ type: Boolean, reflect: true }) open = false;

  toggle() {
    this.open = !this.open;
    this.dispatchEvent(
      new CustomEvent('cyber-toggle', {
        detail: { open: this.open },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <button
        class="cyber-accordion__trigger"
        part="trigger"
        aria-expanded=${this.open ? 'true' : 'false'}
        aria-controls="region"
        @click=${this.toggle}
      >
        <span><slot name="header">${this.heading}</slot></span>
      </button>
      <div
        id="region"
        class="cyber-accordion__region"
        role="region"
        ?data-open=${this.open}
      >
        <div>
          <div class="cyber-accordion__content" part="content">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * <cyber-accordion> — container for <cyber-accordion-item>s. With the
 * `single` attribute, opening one item closes the others.
 *
 * @example
 * <cyber-accordion single>
 *   <cyber-accordion-item heading="Propulsion" open>…</cyber-accordion-item>
 *   <cyber-accordion-item heading="Weapons">…</cyber-accordion-item>
 * </cyber-accordion>
 */
@customElement('cyber-accordion')
export class CyberAccordion extends LitElement {
  static styles = css`
    :host {
      display: block;
      border: var(--cyber-border-width) solid var(--cyber-border-dim);
      background: var(--cyber-surface-glass);
    }
  `;

  /** Allow only one item open at a time. */
  @property({ type: Boolean }) single = false;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('cyber-toggle', this.onToggle);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('cyber-toggle', this.onToggle);
  }

  private onToggle = (event: Event) => {
    if (!this.single) return;
    const opened = event.target;
    if (!(opened instanceof CyberAccordionItem) || !opened.open) return;
    for (const item of this.querySelectorAll('cyber-accordion-item')) {
      if (item !== opened) item.open = false;
    }
  };

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-accordion': CyberAccordion;
    'cyber-accordion-item': CyberAccordionItem;
  }
}
