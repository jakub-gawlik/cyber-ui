import { LitElement, html, css, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { slotHasContent } from './internal/slots.js';
import modalStyles from '../styles/components/modal.css?inline';

/**
 * <cyber-modal> — modal dialog built on native <dialog> (top layer, focus
 * trap and Escape handling come from the platform).
 *
 * Open declaratively (`open` attribute / property) or imperatively with
 * `show()` / `close()`. Emits `cyber-open` whenever it opens and
 * `cyber-close` (detail: { returnValue }) whenever it closes, by any path.
 *
 * Return value: mirrors native `<dialog>.returnValue`. Set it with
 * `close(value)` or by submitting a slotted `<form method="dialog">` — the
 * submit button's `value` becomes the return value (a light-DOM form can't
 * reach the shadow <dialog> natively, so the element handles it). Read it
 * from `modal.returnValue` or the `cyber-close` detail. It resets to `''`
 * each time the modal opens, so Escape / backdrop / ✕ report `''`.
 *
 * @slot title - Heading text in the header bar.
 * @slot - Body content.
 * @slot footer - Actions; the footer collapses when empty.
 * @csspart dialog - The native <dialog>.
 * @csspart header - Header bar holding the title and close button.
 * @csspart body - Body wrapper.
 * @csspart footer - Footer wrapper.
 * @csspart close-button - The ✕ button.
 * @fires {CustomEvent} cyber-open - The modal opened, by any path.
 * @fires {CustomEvent<{ returnValue: string }>} cyber-close - The modal
 *   closed, by any path; `detail.returnValue` mirrors `returnValue`.
 *
 * @example
 * <cyber-modal id="alert">
 *   <span slot="title">Incoming Transmission</span>
 *   <p>Hostile fleet detected on the outer rim.</p>
 *   <form slot="footer" method="dialog">
 *     <button value="retreat" class="cyber-btn">Retreat</button>
 *     <button value="engage" class="cyber-btn cyber-btn--primary">Engage</button>
 *   </form>
 * </cyber-modal>
 * <script>
 *   alert.addEventListener('cyber-close', (e) => console.log(e.detail.returnValue));
 * </script>
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
  @property({ type: Boolean, attribute: 'no-light-dismiss' }) noLightDismiss =
    false;

  @state() private hasFooter = false;

  @query('dialog') private dialog!: HTMLDialogElement;

  /** The dialog's return value (see the class docs). */
  get returnValue(): string {
    return this.dialog?.returnValue ?? '';
  }

  set returnValue(value: string) {
    if (this.dialog) this.dialog.returnValue = value;
  }

  show() {
    this.open = true;
  }

  /** Close the dialog, optionally setting its `returnValue`. */
  close(returnValue?: string) {
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.open = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('submit', this.onSubmit);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('submit', this.onSubmit);
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('open')) {
      if (this.open && !this.dialog.open) {
        this.dialog.returnValue = '';
        this.dialog.showModal();
        this.dispatchEvent(
          new CustomEvent('cyber-open', { bubbles: true, composed: true }),
        );
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
      new CustomEvent('cyber-close', {
        detail: { returnValue: this.dialog.returnValue },
        bubbles: true,
        composed: true,
      }),
    );
  };

  /** Slotted `<form method="dialog">` (or a `formmethod="dialog"`
      submitter): its nearest <dialog> ancestor is not ours across the
      shadow boundary, so do the dialog submission here. */
  private onSubmit = (event: SubmitEvent) => {
    const submitter = event.submitter as
      HTMLButtonElement | HTMLInputElement | null;
    const method =
      submitter?.getAttribute('formmethod') ??
      (event.target as HTMLFormElement).getAttribute('method');
    if (method?.toLowerCase() !== 'dialog') return;
    event.preventDefault();
    this.close(submitter?.value ?? '');
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
            @click=${() => this.close()}
          >
            &#x2715;
          </button>
        </header>
        <div class="cyber-modal__body" part="body">
          <slot></slot>
        </div>
        <footer
          class="cyber-modal__footer"
          part="footer"
          ?hidden=${!this.hasFooter}
        >
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
