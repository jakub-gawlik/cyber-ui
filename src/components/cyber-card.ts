import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { slotHasContent } from './internal/slots.js';
import cardStyles from '../styles/components/card.css?inline';

/**
 * <cyber-card> — content card with media header, title + content body and
 * a footer link row. Shares its stylesheet with the class-based
 * `.cyber-card` (see styles/components/card.css).
 *
 * Slots: `media` (image), `title`, default (content), `footer` (links).
 * Parts: card, media, body, title, content, footer.
 *
 * @example
 * <cyber-card>
 *   <img slot="media" src="nebula.jpg" alt="Nebula">
 *   <span slot="title">Signal Lost</span>
 *   <p>Long-range sensors report an anomaly…</p>
 *   <a slot="footer" href="#">Details</a>
 * </cyber-card>
 */
@customElement('cyber-card')
export class CyberCard extends LitElement {
  static styles = [
    unsafeCSS(cardStyles),
    css`
      :host {
        display: block;
      }

      [hidden] {
        display: none !important;
      }

      /* <cyber-card class="cyber-glass"> — frosted variant, matching the
         .cyber-glass utility in effects.css */
      :host(.cyber-glass) .cyber-card {
        background-color: color-mix(in srgb, var(--cyber-surface) 52%, transparent);
        -webkit-backdrop-filter: blur(14px) saturate(1.4);
        backdrop-filter: blur(14px) saturate(1.4);
      }

      /* mirror of .cyber-link (link.css) for slotted footer anchors */
      ::slotted(a) {
        font-family: var(--cyber-font-mono);
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--cyber-primary);
        text-decoration: none;
        border-bottom: 1px solid transparent;
        padding-bottom: 2px;
        transition: text-shadow 0.15s ease, border-color 0.15s ease;
      }

      ::slotted(a:hover),
      ::slotted(a:focus-visible) {
        text-shadow: 0 0 8px var(--cyber-glow-color);
        border-bottom-color: var(--cyber-primary);
      }
    `,
  ];

  @state() private hasMedia = false;
  @state() private hasTitle = false;
  @state() private hasFooter = false;

  private onSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const has = slotHasContent(slot);
    if (slot.name === 'media') this.hasMedia = has;
    else if (slot.name === 'title') this.hasTitle = has;
    else if (slot.name === 'footer') this.hasFooter = has;
  }

  render() {
    return html`
      <article class="cyber-card" part="card">
        <figure class="cyber-card__media" part="media" ?hidden=${!this.hasMedia}>
          <slot name="media" @slotchange=${this.onSlotChange}></slot>
        </figure>
        <div class="cyber-card__body" part="body">
          <h3 class="cyber-card__title" part="title" ?hidden=${!this.hasTitle}>
            <slot name="title" @slotchange=${this.onSlotChange}></slot>
          </h3>
          <div class="cyber-card__content" part="content">
            <slot></slot>
          </div>
        </div>
        <footer class="cyber-card__footer" part="footer" ?hidden=${!this.hasFooter}>
          <slot name="footer" @slotchange=${this.onSlotChange}></slot>
        </footer>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-card': CyberCard;
  }
}
