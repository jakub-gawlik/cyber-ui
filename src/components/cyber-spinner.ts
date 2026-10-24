import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import spinnerStyles from '../styles/components/spinner.css?inline';

export type SpinnerVariant =
  'primary' | 'accent' | 'warning' | 'danger' | 'success';

/**
 * <cyber-spinner> — loading indicator: a rotating ring, announced as a
 * `role="status"` region named by `label` (default "Loading"). Slot text
 * for a visible caption. Size with `--cyber-spinner-size`.
 *
 * @slot - Optional visible caption.
 * @csspart base - The `role="status"` wrapper.
 * @csspart ring - The rotating ring.
 * @csspart label - The caption.
 *
 * @example
 * <cyber-spinner label="Decrypting">Decrypting</cyber-spinner>
 */
@customElement('cyber-spinner')
export class CyberSpinner extends LitElement {
  static styles = [
    unsafeCSS(spinnerStyles),
    css`
      :host {
        display: inline-block;
      }
    `,
  ];

  /** Accessible name of the status region. */
  @property() label = 'Loading';

  /** Color: `primary` (default), `accent`, `warning`, `danger`, `success`. */
  @property({ reflect: true }) variant: SpinnerVariant = 'primary';

  render() {
    const variant =
      this.variant === 'primary' ? '' : ` cyber-spinner--${this.variant}`;
    return html`
      <div
        class="cyber-spinner${variant}"
        part="base"
        role="status"
        aria-label=${this.label}
      >
        <span class="cyber-spinner__ring" part="ring"></span>
        <span class="cyber-spinner__label" part="label"><slot></slot></span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-spinner': CyberSpinner;
  }
}
