import { LitElement, html, css, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { slotHasContent } from './internal/slots.js';
import modalStyles from '../styles/components/modal.css?inline';

/**
 * <cyber-modal> — modal dialog built on native <dialog> (top layer, focus
 * trap and Escape handling come from the platform).
 *
 * Open declaratively (`open` attribute / property) or imperatively with
 * `show()` / `close()`. Emits `cyber-close` when dismissed.
 *
 * Slots: `title`, default (body), `footer` (actions).
 * Parts: dialog, header, body, footer, close-button.
 *
 * @example
 * <cyber-modal id="alert">
 *   <span slot="title">Incoming Transmission</span>
 *   <p>Hostile fleet detected on the outer rim.</p>
 *   <button slot="footer" class="cyber-btn cyber-btn--primary">Engage</button>
 * </cyber-modal>
 */
@customElement('cyber-modal')
export class CyberModal extends LitElement {
  static styles = [
    unsafeCSS(modalStyles),
    css`
      :host {
        display: contents;
      }

      [hidden] {
        display: none !important;
      }

      ::slotted([slot='footer']) {
        margin: 0;
      }
    `,
  ];

  /** Whether the dialog is shown. Reflected so `<cyber-modal open>` works. */
  @property({ type: Boolean, reflect: true }) open = false;

  /** Set false to disable closing via Escape / backdrop click. */
  @property({ type: Boolean, attribute: 'no-light-dismiss' }) noLightDismiss = false;

  @state() private hasFooter = false;

  @query('dialog') private dialog!: HTMLDialogElement;

  show() {
    this.open = true;
  }

  close() {
    this.open = false;
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('open')) {
      if (this.open && !this.dialog.open) {
        this.dialog.showModal();
      } else if (!this.open && this.dialog.open) {
        this.dialog.close();
      }
    }
  }

  /** Native close event — fires once for every close path (Escape, the
      close button, backdrop click, close(), form method=dialog), so it is
      the single place cyber-close is emitted. */
  private onNativeClose = () => {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('cyber-close', { bubbles: true, composed: true }),
    );
  };

  private onCancel = (event: Event) => {
    if (this.noLightDismiss) event.preventDefault();
  };

  private onDialogClick = (event: MouseEvent) => {
    // content fills the dialog, so a click landing on the <dialog> itself
    // means the backdrop (or a clipped corner) was clicked
    if (event.target === this.dialog && !this.noLightDismiss) this.close();
  };

  private onFooterSlotChange(event: Event) {
    this.hasFooter = slotHasContent(event.target as HTMLSlotElement);
  }

  render() {
    return html`
      <dialog
        class="cyber-modal"
        part="dialog"
        @close=${this.onNativeClose}
        @cancel=${this.onCancel}
        @click=${this.onDialogClick}
      >
        <header class="cyber-modal__header" part="header">
          <span><slot name="title"></slot></span>
          <button
            class="cyber-modal__close"
            part="close-button"
            aria-label="Close"
            @click=${this.close}
          >
            &#x2715;
          </button>
        </header>
        <div class="cyber-modal__body" part="body">
          <slot></slot>
        </div>
        <footer class="cyber-modal__footer" part="footer" ?hidden=${!this.hasFooter}>
          <slot name="footer" @slotchange=${this.onFooterSlotChange}></slot>
        </footer>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cyber-modal': CyberModal;
  }
}
